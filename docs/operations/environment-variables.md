# Required environment variables

Mudrax CRM never commits real secrets. Use `.env` locally (gitignored) and
`deploy/env/.env.production.example` / `.env.staging.example` as templates.

## Required (all environments)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Prisma) |
| `AUTH_SECRET` | Auth.js signing secret (≥32 random chars) |
| `AUTH_URL` | Public app origin used by Auth.js |
| `APP_URL` | Public app URL |

## Strongly recommended (production)

| Variable | Purpose |
| --- | --- |
| `AUTH_TRUST_HOST=true` | Behind reverse proxy |
| `REDIS_URL` / `REDIS_PASSWORD` | Job locks + login rate limits |
| `JOBS_CRON_SECRET` | Protects `/api/internal/jobs/tick` |
| `DOCUMENTS_LOCAL_STORAGE_ROOT` | Upload/document storage path |
| `APP_VERSION` | Reported by `/api/health` |

## Secrets policy

- Never commit `.env`, credentials, API tokens, or private keys.
- Rotate `AUTH_SECRET`, DB, and Redis passwords independently.
- Seed passwords (`ADMIN_DEV_PASSWORD`) are **dev-only** — never use against production.
