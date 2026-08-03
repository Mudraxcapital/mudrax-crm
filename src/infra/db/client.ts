// ============================================================================
// src/infra/db/client.ts
//
// Single Prisma Client instance (singleton) and connection lifecycle, per
// src/infra/db/README.md. Prisma ORM v7 requires a driver adapter
// (`@prisma/adapter-pg`, already standardized on across this project — see
// prisma/seed/lib/client.ts) instead of a bare `DATABASE_URL` passed to the
// constructor.
//
// The `globalThis` cache guards against Next.js dev-mode hot-reload creating
// a fresh PrismaClient (and a fresh connection pool) on every module reload.
// After `prisma generate` adds models, a cached instance can lack new
// delegates (e.g. `integrationConnection`) — we detect that and recreate.
// A Proxy ensures callers never keep a permanently stale reference.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/** Bump when adding/removing Prisma models (extra signal beyond delegate checks). */
const PRISMA_CLIENT_REVISION = 6;

declare global {
  var __mudraxPrisma: PrismaClient | undefined;
  var __mudraxPrismaRevision: number | undefined;
  var __mudraxPgPool: Pool | undefined;
}

let prismaClient: PrismaClient | undefined;

function getPool(): Pool {
  if (globalThis.__mudraxPgPool) {
    return globalThis.__mudraxPgPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env (see docs/development/local-environment.md).",
    );
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
  });
  pool.on("error", (error) => {
    console.error("[db] Unexpected PostgreSQL pool error", error);
  });

  globalThis.__mudraxPgPool = pool;
  return pool;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({ adapter });
}

/** True when this client exposes models required by current app code. */
function clientHasRequiredModels(client: PrismaClient): boolean {
  const c = client as unknown as Record<string, { findMany?: unknown } | undefined>;
  return (
    typeof c.lead?.findMany === "function" &&
    typeof c.stagedLead?.findMany === "function" &&
    typeof c.integrationConnection?.findMany === "function" &&
    typeof c.webhookEndpoint?.findMany === "function" &&
    typeof c.apiKey?.findMany === "function" &&
    typeof c.jobRun?.findMany === "function"
  );
}

function getPrismaClient(): PrismaClient {
  const existing = prismaClient ?? globalThis.__mudraxPrisma;
  if (
    existing &&
    globalThis.__mudraxPrismaRevision === PRISMA_CLIENT_REVISION &&
    clientHasRequiredModels(existing)
  ) {
    prismaClient = existing;
    return existing;
  }

  if (existing) {
    void existing.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  if (!clientHasRequiredModels(client)) {
    throw new Error(
      "Prisma Client is missing required models (e.g. integrationConnection). Run `npx prisma generate` and restart the Next.js server.",
    );
  }

  // Always cache — production used to recreate a client per property access.
  prismaClient = client;
  globalThis.__mudraxPrisma = client;
  globalThis.__mudraxPrismaRevision = PRISMA_CLIENT_REVISION;
  return client;
}

/**
 * Always resolves through getPrismaClient() so HMR / stale singletons cannot
 * leave repositories holding a client without new model delegates.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
