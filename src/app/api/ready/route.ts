import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/infra/db/client";
import { isRedisAvailable } from "@/infra/redis";

export const dynamic = "force-dynamic";

const VERSION = process.env.npm_package_version ?? process.env.APP_VERSION ?? "0.1.0";

async function checkDatabase(): Promise<{ ok: boolean; detail?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "database unreachable",
    };
  }
}

async function checkRedis(): Promise<{ ok: boolean; optional: boolean; detail?: string }> {
  if (!process.env.REDIS_URL) {
    return { ok: true, optional: true, detail: "REDIS_URL not configured" };
  }
  try {
    const ok = await isRedisAvailable();
    return { ok, optional: true, detail: ok ? "pong" : "unreachable" };
  } catch (error) {
    return {
      ok: false,
      optional: true,
      detail: error instanceof Error ? error.message : "redis error",
    };
  }
}

function checkStorage(): { ok: boolean; detail?: string } {
  const root = process.env.DOCUMENTS_LOCAL_STORAGE_ROOT ?? path.join(process.cwd(), ".data");
  try {
    const ok = existsSync(root) || existsSync(process.cwd());
    return { ok, detail: root };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "storage check failed",
    };
  }
}

/** Readiness — required dependencies must be healthy. */
export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const storage = checkStorage();

  const ready = database.ok && storage.ok && (redis.ok || redis.optional);
  const body = {
    status: ready ? "ready" : "not_ready",
    check: "ready",
    version: VERSION,
    checks: {
      application: { ok: true },
      database,
      redis,
      storage,
    },
  };

  return NextResponse.json(body, { status: ready ? 200 : 503 });
}
