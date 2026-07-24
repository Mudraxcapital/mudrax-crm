// ============================================================================
// prisma/seed/lib/client.ts
//
// A standalone Prisma Client instance for the seed CLI only.
//
// The application's own Prisma Client singleton (src/infra/db) is
// intentionally not implemented yet — see src/infra/db/README.md ("Choosing
// and wiring the adapter is deferred to when the Prisma client singleton is
// actually implemented here"). A seed script is a separate CLI entrypoint
// (`tsx prisma/seed/index.ts`, wired via prisma.config.ts's
// `migrations.seed`), not application runtime code, so it is correct for it
// to own a short-lived client of its own rather than depend on
// infrastructure that does not exist yet.
//
// Prisma ORM v7 requires a driver adapter passed to the constructor instead
// of a bare `DATABASE_URL` — this project already standardizes on
// `@prisma/adapter-pg` (see package.json dependencies).
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function createSeedClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env (see docs/development/local-environment.md) before seeding.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
