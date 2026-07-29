import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/infra/db/client";
import { isRedisAvailable } from "@/infra/redis";

export const dynamic = "force-dynamic";

const VERSION = process.env.npm_package_version ?? process.env.APP_VERSION ?? "0.1.0";

/**
 * Aggregate health — returns 200 when the app can serve traffic;
 * 503 when a required dependency is down. Suitable for load balancers.
 */
export async function GET() {
  let database: { ok: boolean; detail?: string } = { ok: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true };
  } catch (error) {
    database = {
      ok: false,
      detail: error instanceof Error ? error.message : "database unreachable",
    };
  }

  let redis: { ok: boolean; optional: boolean; detail?: string } = {
    ok: true,
    optional: true,
    detail: "REDIS_URL not configured",
  };
  if (process.env.REDIS_URL) {
    try {
      const ok = await isRedisAvailable();
      redis = { ok, optional: true, detail: ok ? "pong" : "unreachable" };
    } catch (error) {
      redis = {
        ok: false,
        optional: true,
        detail: error instanceof Error ? error.message : "redis error",
      };
    }
  }

  const storageRoot =
    process.env.DOCUMENTS_LOCAL_STORAGE_ROOT ?? path.join(process.cwd(), ".data");
  const storage = {
    ok: existsSync(storageRoot) || existsSync(process.cwd()),
    detail: storageRoot,
  };

  const healthy = database.ok && storage.ok;
  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      check: "health",
      version: VERSION,
      checks: {
        application: { ok: true },
        database,
        redis,
        storage,
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
