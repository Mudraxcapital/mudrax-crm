# Production deployment

## Architecture

One Next.js app (ADR 0001) + Postgres + Redis + optional jobs worker.

## Docker Compose (production)

1. Copy `deploy/env/.env.production.example` → `.env.production` and fill secrets.
2. Build and start:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

3. Apply migrations (first boot or after schema changes):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma migrate deploy
```

4. Health checks:

- `GET /api/live` — process up
- `GET /api/ready` — DB (+ Redis if configured)
- `GET /api/health` — aggregate status

## Jobs worker

The `jobs` service runs `npm run jobs:worker` (same image, different command).
Alternatively, schedule `POST /api/internal/jobs/tick` with
`Authorization: Bearer $JOBS_CRON_SECRET`.

## Restart policies

All production services use `restart: unless-stopped`.

## Local development

Continue using `docker-compose.yml` (`npm run docker:up`).
