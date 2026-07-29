// ============================================================================
// src/infra/redis/tempStore.ts
//
// Short-lived key/value helpers for temporary tokens (password-reset style
// one-time tokens, upload tickets, etc.). Values are never logged.
// ============================================================================

import { getRedis } from "./client";

export async function setTempValue(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  await redis.set(`tmp:${key}`, value, { EX: ttlSeconds });
  return true;
}

export async function getTempValue(key: string): Promise<string | null> {
  const redis = await getRedis();
  if (!redis) return null;
  return redis.get(`tmp:${key}`);
}

export async function consumeTempValue(key: string): Promise<string | null> {
  const redis = await getRedis();
  if (!redis) return null;
  const fullKey = `tmp:${key}`;
  const script = `
    local v = redis.call("get", KEYS[1])
    if v then
      redis.call("del", KEYS[1])
    end
    return v
  `;
  const result = await redis.eval(script, { keys: [fullKey], arguments: [] });
  return typeof result === "string" ? result : null;
}
