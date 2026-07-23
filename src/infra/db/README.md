# infra/db

Single Prisma Client instance (singleton) and connection lifecycle.

**Note (Prisma ORM v7)**: this project uses Prisma 7, which requires a driver
adapter (e.g. `@prisma/adapter-pg`) passed to the `PrismaClient` constructor
instead of a bare `DATABASE_URL` on the client — the connection URL is only
read from `prisma.config.ts` for the CLI/Migrate. Choosing and wiring the
adapter is deferred to when the Prisma client singleton is actually
implemented here.
