# application/use-cases

One business action per file/folder for the `banks` module (e.g. a single thing the system *does*).

Orchestrates `domain/` objects and calls out to `application/ports` for anything external. No Prisma, no React, no HTTP here.

**Never put here**: direct Prisma Client calls, `res.json(...)`, or React.
