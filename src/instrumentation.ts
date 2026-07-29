/**
 * Next.js instrumentation hook.
 *
 * Background jobs are started via `npm run jobs:worker` or
 * `POST /api/internal/jobs/tick` — not from this file. Importing the jobs
 * runner here causes Turbopack to pull Prisma/pg into the instrumentation
 * bundle (`Can't resolve 'fs'`), which breaks `next dev`.
 */
export async function register() {
  // Intentionally empty — see src/infra/jobs/README.md.
}
