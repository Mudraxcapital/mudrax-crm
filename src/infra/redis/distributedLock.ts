// ============================================================================
// src/infra/redis/distributedLock.ts
//
// SET key NX PX ttl — Redis distributed lock with token ownership.
// Used by background jobs when Redis is available; callers must fall back
// to Postgres advisory locks when acquire returns null / unavailable.
// ============================================================================

import { randomUUID } from "node:crypto";
import { getRedis } from "./client";

export interface RedisLockHandle {
  key: string;
  token: string;
}

export async function acquireRedisLock(
  key: string,
  ttlMs: number,
): Promise<RedisLockHandle | null> {
  const redis = await getRedis();
  if (!redis) return null;

  const token = randomUUID();
  const result = await redis.set(key, token, { NX: true, PX: ttlMs });
  if (result !== "OK") return null;
  return { key, token };
}

/** Release only if we still own the lock (compare-and-delete via Lua). */
export async function releaseRedisLock(handle: RedisLockHandle): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const result = await redis.eval(script, {
    keys: [handle.key],
    arguments: [handle.token],
  });
  return result === 1;
}
