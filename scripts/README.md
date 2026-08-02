# Scripts

Operational scripts for local development, database maintenance, and background jobs.

**Never put here**: business logic the app needs at runtime — that belongs in a module under `src/modules/`.

| Folder | Purpose |
| --- | --- |
| `dev/` | Local start / restart helpers (`start-app.ps1`, `restart-dev.ps1`) |
| `db/` | One-off database maintenance (wipe test data, RBAC reseed, Prisma checks) |
| `jobs/` | Background job worker entrypoint (`jobs-worker.ts`) |
| `mobile/` | Notes for Android/Expo release packaging |

Prefer `npm run …` scripts from the root `package.json` over calling these files directly.
