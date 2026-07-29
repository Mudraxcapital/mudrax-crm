// ============================================================================
// src/infra/redis/client.ts
//
// Optional Redis connection. When REDIS_URL is unset or Redis is unreachable,
// helpers degrade gracefully (jobs fall back to Postgres advisory locks;
// rate limits become no-ops with a warn log). Never throws on connect failure
// at import time — callers use isRedisAvailable().
// ============================================================================

import { createClient, type RedisClientType } from "redis";

declare global {
  var __mudraxRedis: RedisClientType | undefined;
  var __mudraxRedisConnecting: Promise<RedisClientType | null> | undefined;
}

function redisLog(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const payload = { ts: new Date().toISOString(), level, component: "infra.redis", message, ...meta };
  if (level === "error") console.error(JSON.stringify(payload));
  else if (level === "warn") console.warn(JSON.stringify(payload));
  else console.info(JSON.stringify(payload));
}

export function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url ? url : null;
}

async function connectRedis(): Promise<RedisClientType | null> {
  const url = getRedisUrl();
  if (!url) {
    redisLog("info", "redis.disabled", { reason: "REDIS_URL not set" });
    return null;
  }

  if (globalThis.__mudraxRedis?.isOpen) {
    return globalThis.__mudraxRedis;
  }

  const client: RedisClientType = createClient({
    url,
    socket: {
      connectTimeout: 3_000,
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error("Redis reconnect limit reached");
        return Math.min(retries * 200, 2_000);
      },
    },
  });

  client.on("error", (err) => {
    redisLog("error", "redis.client_error", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  try {
    await client.connect();
    globalThis.__mudraxRedis = client;
    redisLog("info", "redis.connected");
    return client;
  } catch (error) {
    redisLog("warn", "redis.connect_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
    return null;
  }
}

/** Lazy singleton — returns null when Redis is unavailable. */
export async function getRedis(): Promise<RedisClientType | null> {
  if (globalThis.__mudraxRedis?.isOpen) return globalThis.__mudraxRedis;
  if (!globalThis.__mudraxRedisConnecting) {
    globalThis.__mudraxRedisConnecting = connectRedis().finally(() => {
      globalThis.__mudraxRedisConnecting = undefined;
    });
  }
  return globalThis.__mudraxRedisConnecting;
}

export async function isRedisAvailable(): Promise<boolean> {
  const client = await getRedis();
  if (!client) return false;
  try {
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

/** Test/shutdown helper. */
export async function disconnectRedis(): Promise<void> {
  const client = globalThis.__mudraxRedis;
  globalThis.__mudraxRedis = undefined;
  globalThis.__mudraxRedisConnecting = undefined;
  if (client?.isOpen) {
    await client.quit().catch(() => undefined);
  }
}
