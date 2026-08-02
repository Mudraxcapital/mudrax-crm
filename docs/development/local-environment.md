# Local Development Environment (Docker)

This is the setup guide for running Mudrax CRM locally with Docker Desktop
and Docker Compose. It is an **infrastructure/tooling document**, not an
architecture document — it does not change, and must not be read as
changing, anything in `docs/adr/`. See [ADR 0001](../adr/0001-modular-monolith-and-clean-architecture.md)
for the accepted architecture this environment runs: **one deployable
Next.js application** (frontend + Route Handler "backend" together), backed
by PostgreSQL, with Redis provisioned as general-purpose infrastructure.

## What gets run

| Service | Image / Build | Purpose |
| --- | --- | --- |
| `app` | built from the repo's `Dockerfile` (`dev` target) | The Next.js application — UI and API Route Handlers, in one process. |
| `postgres` | `postgres:16-alpine` | Primary relational database (Prisma's migration target). |
| `redis` | `redis:7-alpine` | General-purpose infrastructure, provisioned only — see [Why Redis is here](#why-redis-is-here). |

All three run on one private Docker network (`mudrax-crm-network`) defined in
`docker-compose.yml`, so they address each other by service name
(`postgres`, `redis`) rather than by IP or `localhost`.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running (includes Docker Compose v2 — check with `docker compose version`).
- Git (to have cloned this repository).
- Node.js is **not required on the host** to run the app via Docker — the container supplies its own Node.js runtime. You still need Node.js locally if you want to run `npm` scripts (lint, type-check, Prisma CLI) directly on the host outside a container.

## First-time setup

1. Copy the environment template and adjust values as needed (the shipped
   defaults work out of the box for local development; only real
   integration/provider credentials require real values):

   ```bash
   cp .env.example .env
   ```

2. Build the images and start every service in the background:

   ```bash
   docker compose up -d --build
   # or: npm run docker:up
   ```

3. Watch the app come up (first boot is slower — installing dependencies and
   generating the Prisma Client happened at image build time, but Next.js's
   own dev-server cold start still takes a few seconds):

   ```bash
   docker compose logs -f app
   # or: npm run docker:logs
   ```

4. Once healthy, open [http://localhost:3000](http://localhost:3000).

5. Check that everything reports healthy:

   ```bash
   docker compose ps
   ```

   You should see `app`, `postgres`, and `redis` all listed as `healthy`.

## Applying the database schema

Schema lives under `prisma/models/*`. With Postgres reachable at `localhost:5432`
(docker-compose publishes the port), run from the host:

```bash
npm run prisma:generate
npx prisma migrate deploy   # or: npm run prisma:migrate  (dev migrate)
npm run db:seed
```

## Everyday commands

| Command | Effect |
| --- | --- |
| `docker compose up -d` | Start all services in the background (no rebuild). |
| `npm run docker:up` | Rebuild images (picks up `package.json`/Dockerfile changes) and start everything. |
| `docker compose logs -f app` / `npm run docker:logs` | Follow the app container's logs. |
| `docker compose exec app sh` | Open a shell inside the running app container. |
| `docker compose exec postgres psql -U mudrax -d mudrax_crm` | Open a `psql` prompt against the database. |
| `docker compose restart app` | Restart just the app (rarely needed — source changes hot-reload). |
| `npm run docker:down` | Stop and remove containers; **named volumes (data) are kept**. |
| `npm run docker:reset` | Stop and remove containers **and delete all data volumes** — a clean slate. |

## How hot reload works

The `app` service bind-mounts the entire repository into the container
(`.:/app`), so edits made on the host are visible inside the container
immediately, and Next.js's dev server (Turbopack) picks them up. Two
directories are deliberately **excluded** from that bind mount via anonymous
volumes: `node_modules` and `.next`. This keeps the container's own
Linux-built `node_modules` (which may contain platform-specific binaries,
e.g. Prisma's query engine) intact instead of being overwritten by
whatever — if anything — exists in those folders on the host.

If you change `package.json` (add/remove a dependency) or the `Dockerfile`
itself, rebuild: `npm run docker:up`.

## Why Redis is here

Redis backs **distributed job locks**, **login rate limiting**, and
**temporary tokens** (`src/infra/redis`). Durable job execution state stays
in Postgres (`jobs.job_runs`). When Redis is unreachable the app degrades:
jobs fall back to Postgres advisory locks; rate limits fail open.

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `port is already allocated` | Something on the host already uses 3000/5432/6379. Stop it, or override the port via `.env` (`PORT`, `POSTGRES_PORT`, `REDIS_PORT`). |
| `app` never becomes healthy | Check `docker compose logs app` — often a missing/invalid `.env` value. Confirm `.env` exists (step 1). |
| Prisma errors about the query engine | Rebuild without cache: `docker compose build --no-cache app`. This usually means a stale `node_modules` volume from a different OS/architecture. |
| Changes to `package.json` don't take effect | Rebuild the image: `npm run docker:up` (a plain `docker compose up` does not reinstall dependencies). |
| Want a completely clean database/cache | `npm run docker:reset`, then `docker compose up -d --build` again. |

## Explicitly out of scope here

Per the current task, this environment intentionally does **not** include:

- A separate backend service/container (ADR 0001 — one Next.js app only).
- Prisma schema/models or seed data.
- Any Redis client wiring, cache implementation, or queue library.
- Production deployment configuration — that remains `deploy/` (PM2 +
  Nginx, per ADR/README), unaffected by this Docker Compose setup.
