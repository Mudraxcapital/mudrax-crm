// ============================================================================
// src/infra/jobs/runner.ts
//
// Single-tick and interval worker. Prefers Redis distributed lock; falls
// back to Postgres advisory locks when Redis is unavailable. Every handler
// execution is logged via JobRun (idempotent where keyed).
// ============================================================================

import { randomUUID } from "node:crypto";
import { prisma } from "@/infra/db/client";
import { getCompanyId } from "@/infra/company/getCompanyId";
import { logger } from "@/infra/logger";
import { claimJobRun, completeJobRun, failJobRun } from "./jobRunStore";
import { acquireJobsLock, releaseJobsDistributedLock } from "./distributedLock";
import { JOBS_ADVISORY_LOCK_KEY } from "./lockConstants";
import {
  followUpLifecycleHandler,
  followUpReminderHandler,
} from "./handlers/followUpHandlers";
import {
  processNotificationQueueHandler,
  retryFailedNotificationsHandler,
} from "./handlers/notificationHandlers";
import { retryFailedJobsHandler } from "./handlers/retryFailedJobsHandler";
import { DEFAULT_TIMEZONE, minuteKey } from "./timezone";
import type { JobHandler, JobHandlerResult } from "./types";

// Re-export for callers that imported the lock key from runner.
export { JOBS_ADVISORY_LOCK_KEY };

const HANDLERS: JobHandler[] = [
  followUpLifecycleHandler,
  followUpReminderHandler,
  processNotificationQueueHandler,
  retryFailedNotificationsHandler,
  retryFailedJobsHandler,
];

export interface JobsTickSummary {
  skipped: boolean;
  reason?: string;
  correlationId: string;
  results: Array<{ jobType: string; result: JobHandlerResult | null; error?: string }>;
}

function jobsLog(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  if (level === "error") logger.error(message, { component: "infra.jobs", ...meta });
  else if (level === "warn") logger.warn(message, { component: "infra.jobs", ...meta });
  else logger.info(message, { component: "infra.jobs", ...meta });
}

async function resolveOrgTimezone(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true },
  });
  return org?.timezone || DEFAULT_TIMEZONE;
}

async function runHandler(
  handler: JobHandler,
  ctx: {
    organizationId: string;
    correlationId: string;
    now: Date;
    workerId: string;
    timeZone: string;
  },
): Promise<{ result: JobHandlerResult | null; error?: string }> {
  const idempotencyKey = handler.periodic
    ? `tick:${minuteKey(ctx.now, ctx.timeZone)}`
    : `once:${ctx.correlationId}`;

  const run = await claimJobRun({
    jobType: handler.type,
    idempotencyKey,
    organizationId: ctx.organizationId,
    workerId: ctx.workerId,
    correlationId: ctx.correlationId,
    now: ctx.now,
  });

  if (!run) {
    return { result: { processed: 0, details: { skipped: "already-claimed-or-succeeded" } } };
  }

  try {
    const result = await handler.run(ctx);
    await completeJobRun(run.id, result as unknown as Record<string, unknown>, ctx.now);
    jobsLog("info", "job.succeeded", {
      jobType: handler.type,
      jobRunId: run.id,
      correlationId: ctx.correlationId,
      attempt: run.attempt,
      processed: result.processed,
    });
    return { result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failJobRun(run.id, message, run.maxAttempts, run.attempt, ctx.now);
    jobsLog("error", "job.failed", {
      jobType: handler.type,
      jobRunId: run.id,
      correlationId: ctx.correlationId,
      attempt: run.attempt,
      error: message,
    });
    return { result: null, error: message };
  }
}

/** Execute one full jobs tick (all handlers) under a distributed lock. */
export async function runJobsTick(options?: {
  workerId?: string;
  now?: Date;
}): Promise<JobsTickSummary> {
  const workerId = options?.workerId ?? `worker-${process.pid}`;
  const now = options?.now ?? new Date();
  const correlationId = randomUUID();

  const lockResult = await acquireJobsLock();
  if (!lockResult.acquired) {
    jobsLog("info", "jobs.tick.skipped", {
      reason: "lock-held",
      correlationId,
      workerId,
    });
    return { skipped: true, reason: "lock-held", correlationId, results: [] };
  }

  try {
    const organizationId = await getCompanyId();
    const timeZone = await resolveOrgTimezone(organizationId);
    const ctx = { organizationId, correlationId, now, workerId, timeZone };

    jobsLog("info", "jobs.tick.start", {
      correlationId,
      workerId,
      organizationId,
      timeZone,
      lock: lockResult.lock.kind,
    });

    const results: JobsTickSummary["results"] = [];
    for (const handler of HANDLERS) {
      const outcome = await runHandler(handler, ctx);
      results.push({
        jobType: handler.type,
        result: outcome.result,
        error: outcome.error,
      });
    }

    jobsLog("info", "jobs.tick.complete", {
      correlationId,
      workerId,
      handlers: results.length,
    });
    return { skipped: false, correlationId, results };
  } finally {
    await releaseJobsDistributedLock(lockResult.lock).catch(() => undefined);
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let running = false;

export function isJobsWorkerRunning(): boolean {
  return intervalHandle !== null;
}

/**
 * Start the in-process interval worker. Safe to call once per process.
 * Controlled by JOBS_ENABLED (default: true in production, false in test).
 */
export function startJobsWorker(options?: {
  intervalMs?: number;
  workerId?: string;
}): void {
  if (intervalHandle) return;

  const intervalMs =
    options?.intervalMs ??
    Number(process.env.JOBS_INTERVAL_MS ?? 60_000);
  const workerId = options?.workerId ?? `inline-${process.pid}`;

  jobsLog("info", "jobs.worker.start", { workerId, intervalMs });

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runJobsTick({ workerId });
    } catch (error) {
      jobsLog("error", "jobs.tick.unhandled", {
        workerId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      running = false;
    }
  };

  // Kick once shortly after boot, then on interval.
  void tick();
  intervalHandle = setInterval(() => void tick(), intervalMs);
  // Do not keep the event loop alive solely for jobs in short-lived scripts
  // unless this is the dedicated worker process.
  if (process.env.JOBS_KEEP_ALIVE !== "true") {
    intervalHandle.unref?.();
  }
}

export function stopJobsWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    jobsLog("info", "jobs.worker.stop", {});
  }
}

export function shouldAutoStartJobs(): boolean {
  if (process.env.JOBS_INLINE !== "true") return false;
  if (process.env.JOBS_ENABLED === "false") return false;
  if (process.env.JOBS_ENABLED === "true") return true;
  if (process.env.VITEST || process.env.NODE_ENV === "test") return false;
  return process.env.NODE_ENV === "production";
}
