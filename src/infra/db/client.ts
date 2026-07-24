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
// a fresh PrismaClient (and a fresh connection pool) on every module reload —
// the standard, widely-documented Prisma + Next.js pattern.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __mudraxPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env (see docs/development/local-environment.md).",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalThis.__mudraxPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__mudraxPrisma = prisma;
}
