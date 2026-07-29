// ============================================================================
// src/infra/jobs/distributedLock.ts
//
// Prefer Redis SET NX for multi-instance ticks; fall back to Postgres
// advisory locks only when Redis is unavailable (not when the lock is held).
// ============================================================================

import {
  acquireRedisLock,
  isRedisAvailable,
  releaseRedisLock,
  type RedisLockHandle,
} from "@/infra/redis";
import { releaseJobsLock, tryAcquireJobsLock } from "./jobRunStore";
import { JOBS_ADVISORY_LOCK_KEY } from "./lockConstants";

const JOBS_REDIS_LOCK_KEY = "mudrax:jobs:tick";
const JOBS_LOCK_TTL_MS = 4 * 60 * 1000;

export type JobsLock =
  | { kind: "redis"; handle: RedisLockHandle }
  | { kind: "postgres" };

export type AcquireJobsLockResult =
  | { acquired: true; lock: JobsLock }
  | { acquired: false; reason: "held" | "error" };

export async function acquireJobsLock(): Promise<AcquireJobsLockResult> {
  const redisUp = await isRedisAvailable();
  if (redisUp) {
    const handle = await acquireRedisLock(JOBS_REDIS_LOCK_KEY, JOBS_LOCK_TTL_MS);
    if (!handle) return { acquired: false, reason: "held" };
    return { acquired: true, lock: { kind: "redis", handle } };
  }

  const pgLocked = await tryAcquireJobsLock(JOBS_ADVISORY_LOCK_KEY);
  if (!pgLocked) return { acquired: false, reason: "held" };
  return { acquired: true, lock: { kind: "postgres" } };
}

export async function releaseJobsDistributedLock(lock: JobsLock): Promise<void> {
  if (lock.kind === "redis") {
    await releaseRedisLock(lock.handle);
    return;
  }
  await releaseJobsLock(JOBS_ADVISORY_LOCK_KEY);
}
