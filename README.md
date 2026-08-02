# Mudrax CRM

Production Enterprise CRM for **Mudrax Capitals** (Loan DSA). Modular monolith,
Clean Architecture, Domain-Driven feature modules — deployed on the company’s
own Linux server and used daily by employees.

- Business context: [`docs/business/BusinessRequirements.md`](docs/business/BusinessRequirements.md)
- Architecture decisions: [`docs/adr/`](docs/adr)
- Full from-scratch guide: [`docs/setup/getting-started-from-scratch.md`](docs/setup/getting-started-from-scratch.md)

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| API | Next.js Route Handlers + Server Actions |
| Database | PostgreSQL + Prisma |
| Cache / locks | Redis (jobs, rate limits; graceful degrade if down) |
| Auth | Auth.js (NextAuth v5) |
| Validation | Zod |
| Mobile | Expo / React Native (`apps/mobile`) |
| Local infra | Docker Desktop + Docker Compose |
| Production | Linux, PM2, Nginx (`deploy/`) |

---

## Repository layout

```
mudrax-crm/
├── apps/mobile/          # Expo Android client (@mudrax/mobile)
├── packages/
│   ├── api/              # @mudrax/api — typed Axios client for /api/*
│   ├── shared/           # @mudrax/shared — constants, permissions, utils
│   └── types/            # @mudrax/types — shared serializable types
├── src/
│   ├── app/              # Next.js routes (thin)
│   ├── modules/          # Business modules (domain → application → infrastructure → presentation)
│   ├── integrations/     # External system adapters
│   ├── shared/           # Cross-cutting UI/lib
│   ├── infra/            # db, auth, jobs, redis, logger
│   └── styles/
├── prisma/               # Schema (multi-file), migrations, seed
├── tests/
│   ├── e2e/              # Playwright end-to-end tests
│   └── integration/      # Integration test docs / suites
├── scripts/
│   ├── dev/              # start-app.ps1, restart-dev.ps1
│   ├── db/               # DB maintenance one-offs
│   ├── jobs/             # Background worker entrypoint
│   └── mobile/           # APK / Metro packaging notes
├── docs/                 # ADRs, setup, operations, module docs
├── deploy/               # PM2, Nginx, env templates
├── docker-compose.yml    # Local postgres + redis (+ optional app)
├── Dockerfile
└── index.js              # Metro shim for monorepo Android release builds only
```

Root package `mudrax-crm` is the deployable Next.js web CRM (ADR 0001). Mobile and shared packages are npm workspaces.

---

## From scratch — what to download and run

### 1) Install on your machine

| # | Download | Notes |
| --- | --- | --- |
| 1 | [Git](https://git-scm.com/downloads) | Clone the repository |
| 2 | [Node.js 20 LTS](https://nodejs.org/) | Includes npm. Confirm: `node -v` → v20.x |
| 3 | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Must be **running** before compose commands |
| 4 | *(Optional, mobile)* [Android Studio](https://developer.android.com/studio) + [JDK 17](https://learn.microsoft.com/en-us/java/openjdk/download) | SDK Platform-Tools + device/emulator |

Windows details: [`docs/setup/windows-development-setup.md`](docs/setup/windows-development-setup.md).

### 2) Clone and install dependencies

```bash
git clone <repo-url> Mudrax_CRM
cd Mudrax_CRM
npm install
```

This installs the root Next.js app and workspace packages (`apps/*`, `packages/*`).

### 3) Create your `.env`

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Edit `.env` at least:

- `AUTH_SECRET` — long random string (≥ 32 characters)
- Leave `DATABASE_URL` / Redis defaults if you use the included Docker Postgres/Redis

Never commit `.env`. Variable reference: [`docs/operations/environment-variables.md`](docs/operations/environment-variables.md).

### 4) Start the database and the web app

**Easiest (recommended on Windows):**

```bash
npm run app:start
```

What this does:

1. Ensures `.env` exists  
2. Starts **Postgres** + **Redis** via Docker Compose  
3. Waits until Postgres is healthy  
4. Runs `prisma generate`  
5. Starts Next.js on [http://localhost:3000](http://localhost:3000)

**First time only — apply schema and seed users:**

In a second terminal (while Postgres is up):

```bash
npx prisma migrate deploy
npm run db:seed
```

The seed command prints login emails/passwords (development only).

**Alternative — everything in Docker (including the Next.js app):**

```bash
npm run app:start:docker
# or: docker compose up -d --build
```

Then migrate/seed against published `localhost:5432` the same way, or exec into the app container.

**Alternative — fully manual:**

```bash
docker compose up -d postgres redis
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### 5) Open the CRM

| URL | Purpose |
| --- | --- |
| [http://localhost:3000](http://localhost:3000) | Web CRM |
| [http://localhost:3000/login](http://localhost:3000/login) | Sign in with seeded Admin / role users |

### 6) Everyday commands

| Command | Purpose |
| --- | --- |
| `npm run app:start` | Postgres + Redis (Docker) + local Next.js |
| `npm run restart` | Kill port 3000 and start Next.js again |
| `npm run dev` | Next.js only (infra already running) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (`tests/e2e`) |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Dev migrations |
| `npm run db:seed` | Seed RBAC + demo users |
| `npm run jobs:worker` | Background jobs worker |
| `npm run docker:up` / `docker:down` / `docker:logs` / `docker:reset` | Compose helpers |
| `npm run mobile:dev` | Expo Metro |
| `npm run mobile:android` | Run Android client |

Docker-only deep dive: [`docs/development/local-environment.md`](docs/development/local-environment.md).

---

## Mobile app (optional)

1. Web CRM must be reachable on your LAN (`npm run app:start` or Docker).  
2. `Copy-Item apps\mobile\.env.example apps\mobile\.env` and set:

   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
   ```

   Use `ipconfig` (Windows) / `ip a` (Linux) for the PC IP. Physical phones cannot use `localhost`. Android emulator can use `http://10.0.2.2:3000`.

3. From repo root:

   ```bash
   npm run mobile:android
   ```

Full mobile notes: [`apps/mobile/README.md`](apps/mobile/README.md).

---

## Quality checks before you push

```bash
npm run lint
npm run type-check
npm test
npm run build
```

CI runs the same pipeline (plus Playwright) via [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Architecture principles

- **Modular monolith** — one deployable web app; modules talk only through public `index.ts` APIs.
- **Clean Architecture per module** — `domain → application → infrastructure → presentation`.
- **Strict TypeScript** — no implicit `any`, no unchecked indexed access.
- **Enterprise RBAC** — Users get Roles; access comes from Role Permissions, never from separate job-title modules.

See [`docs/adr/`](docs/adr) and [`src/modules/README.md`](src/modules/README.md).

---

## Deployment

Production templates and Nginx/PM2 layout live under [`deploy/`](deploy/). Operational runbooks: [`docs/operations/`](docs/operations/).
