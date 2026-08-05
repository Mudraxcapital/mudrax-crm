# Required environment variables

Mudrax CRM never commits real secrets. Use `.env` locally (gitignored) and
`deploy/env/.env.production.example` / `.env.staging.example` as templates.

## Required (all environments)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Prisma) |
| `AUTH_SECRET` | Auth.js signing secret (≥32 random chars) |
| `AUTH_URL` | Public app origin used by Auth.js (`http://mudrax.crm:3000` local, `https://mudrax.crm` prod) |
| `APP_URL` | Public app URL (same host as `AUTH_URL`) |

## Strongly recommended (production)

| Variable | Purpose |
| --- | --- |
| `AUTH_TRUST_HOST=true` | Behind reverse proxy |
| `REDIS_URL` / `REDIS_PASSWORD` | Job locks + login rate limits |
| `JOBS_CRON_SECRET` | Protects `/api/internal/jobs/tick` |
| `DOCUMENTS_LOCAL_STORAGE_ROOT` | Upload/document storage path |
| `CALL_RECORDINGS_LOCAL_STORAGE_ROOT` | Call recording audio files (external storage; not DB) |
| `APP_VERSION` | Reported by `/api/health` |

## Secrets policy

- Never commit `.env`, credentials, API tokens, or private keys.
- Rotate `AUTH_SECRET`, DB, and Redis passwords independently.
- Seed passwords (`SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD`) are **dev-only** — never use against production.
- Admin login protection (Redis): `ADMIN_LOGIN_RATE_LIMIT` (default 5), `ADMIN_LOGIN_RATE_WINDOW_SECONDS` (60), `ADMIN_LOGIN_FAIL_THRESHOLD` (10), `ADMIN_LOGIN_COOLDOWN_SECONDS` (900).
