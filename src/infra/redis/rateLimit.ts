// ============================================================================
// src/infra/redis/rateLimit.ts
//
// Fixed-window rate limiter. When Redis is unavailable, fails open (allows
// the request) so auth/login never hard-depends on Redis — Postgres login
// attempt audit remains the durable security signal.
// ============================================================================

import { getRedis } from "./client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  /** True when Redis was unreachable and the limiter skipped enforcement. */
  degraded: boolean;
}

export async function checkRateLimit(input: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (!redis) {
    return {
      allowed: true,
      remaining: input.limit,
      retryAfterSeconds: 0,
      degraded: true,
    };
  }

  const redisKey = `rl:${input.key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, input.windowSeconds);
  }

  const ttl = await redis.ttl(redisKey);
  const retryAfterSeconds = ttl > 0 ? ttl : input.windowSeconds;
  const remaining = Math.max(0, input.limit - count);

  return {
    allowed: count <= input.limit,
    remaining,
    retryAfterSeconds,
    degraded: false,
  };
}
