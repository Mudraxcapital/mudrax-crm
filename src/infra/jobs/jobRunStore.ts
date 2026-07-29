// ============================================================================
// src/infra/jobs/jobRunStore.ts
//
// Postgres-backed claim / complete / fail / retry for JobRun rows.
// Unique (jobType, idempotencyKey) prevents duplicate business effects.
// ============================================================================

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/infra/db/client";
import type { JobRunRecord, JobRunStatus } from "./types";

const LOCK_TTL_MS = 5 * 60 * 1000;

function toRecord(row: {
  id: string;
  organizationId: string | null;
  jobType: string;
  idempotencyKey: string;
  status: JobRunStatus;
  attempt: number;
  maxAttempts: number;
  scheduledFor: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  nextAttemptAt: Date | null;
  lockedUntil: Date | null;
  lockedBy: string | null;
  result: Prisma.JsonValue | null;
  errorMessage: string | null;
  correlationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): JobRunRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobType: row.jobType,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    attempt: row.attempt,
    maxAttempts: row.maxAttempts,
    scheduledFor: row.scheduledFor,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    nextAttemptAt: row.nextAttemptAt,
    lockedUntil: row.lockedUntil,
    lockedBy: row.lockedBy,
    result:
      row.result && typeof row.result === "object" && !Array.isArray(row.result)
        ? (row.result as Record<string, unknown>)
        : null,
    errorMessage: row.errorMessage,
    correlationId: row.correlationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Claim a job for execution. Returns null when the idempotency key already
 * succeeded, is currently locked, or is not yet eligible for retry.
 */
export async function claimJobRun(input: {
  jobType: string;
  idempotencyKey: string;
  organizationId: string | null;
  workerId: string;
  correlationId: string;
  maxAttempts?: number;
  now?: Date;
}): Promise<JobRunRecord | null> {
  const now = input.now ?? new Date();
  const maxAttempts = input.maxAttempts ?? 5;
  const lockUntil = new Date(now.getTime() + LOCK_TTL_MS);

  const existing = await prisma.jobRun.findUnique({
    where: {
      jobType_idempotencyKey: {
        jobType: input.jobType,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });

  if (existing) {
    if (existing.status === "SUCCEEDED" || existing.status === "CANCELLED") {
      return null;
    }
    if (
      existing.status === "RUNNING" &&
      existing.lockedUntil &&
      existing.lockedUntil > now
    ) {
      return null;
    }
    if (existing.status === "FAILED") {
      if (existing.attempt >= existing.maxAttempts) return null;
      if (existing.nextAttemptAt && existing.nextAttemptAt > now) return null;
    }

    const updated = await prisma.jobRun.update({
      where: { id: existing.id },
      data: {
        status: "RUNNING",
        attempt: existing.attempt + 1,
        startedAt: now,
        finishedAt: null,
        errorMessage: null,
        lockedBy: input.workerId,
        lockedUntil: lockUntil,
        correlationId: input.correlationId,
        organizationId: input.organizationId ?? existing.organizationId,
      },
    });
    return toRecord(updated);
  }

  try {
    const created = await prisma.jobRun.create({
      data: {
        id: randomUUID(),
        organizationId: input.organizationId,
        jobType: input.jobType,
        idempotencyKey: input.idempotencyKey,
        status: "RUNNING",
        attempt: 1,
        maxAttempts,
        startedAt: now,
        lockedBy: input.workerId,
        lockedUntil: lockUntil,
        correlationId: input.correlationId,
      },
    });
    return toRecord(created);
  } catch (error) {
    // Unique race — another worker claimed first.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}

export async function completeJobRun(
  id: string,
  result: Record<string, unknown> | null,
  now: Date = new Date(),
): Promise<void> {
  await prisma.jobRun.update({
    where: { id },
    data: {
      status: "SUCCEEDED",
      finishedAt: now,
      lockedUntil: null,
      lockedBy: null,
      nextAttemptAt: null,
      result: (result ?? undefined) as Prisma.InputJsonValue | undefined,
      errorMessage: null,
    },
  });
}

export async function failJobRun(
  id: string,
  errorMessage: string,
  maxAttempts: number,
  attempt: number,
  now: Date = new Date(),
): Promise<void> {
  const willRetry = attempt < maxAttempts;
  const backoffSeconds = Math.min(3600, 2 ** Math.min(attempt, 8) * 15);
  await prisma.jobRun.update({
    where: { id },
    data: {
      status: "FAILED",
      finishedAt: now,
      lockedUntil: null,
      lockedBy: null,
      errorMessage: errorMessage.slice(0, 4000),
      nextAttemptAt: willRetry ? new Date(now.getTime() + backoffSeconds * 1000) : null,
    },
  });
}

/** Re-queue FAILED jobs whose nextAttemptAt has elapsed (jobs.retry-failed). */
export async function listRetryableFailedJobs(
  limit: number,
  now: Date = new Date(),
): Promise<JobRunRecord[]> {
  const rows = await prisma.jobRun.findMany({
    where: {
      status: "FAILED",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      // attempt < maxAttempts enforced in app after fetch (Prisma can't compare columns easily)
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit * 2,
  });
  return rows
    .filter((row) => row.attempt < row.maxAttempts)
    .slice(0, limit)
    .map(toRecord);
}

/** Postgres session advisory lock — one tick at a time per database. */
export async function tryAcquireJobsLock(lockKey: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(${lockKey}) AS locked
  `;
  return Boolean(rows[0]?.locked);
}

export async function releaseJobsLock(lockKey: number): Promise<void> {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(${lockKey})`;
}
