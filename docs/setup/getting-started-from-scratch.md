# Getting started from scratch

Complete checklist for a new machine. The short path is also in the root
[`README.md`](../../README.md).

## 1. Install tools

| Tool | Version | Why |
| --- | --- | --- |
| [Git](https://git-scm.com/downloads) | latest | Clone the repo |
| [Node.js](https://nodejs.org/) | **20 LTS** (includes npm) | Web + monorepo workspaces |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | latest | Postgres + Redis (and optional full-stack Docker) |
| [JDK 17](https://learn.microsoft.com/en-us/java/openjdk/download) | 17 | Android release APK only |
| [Android Studio](https://developer.android.com/studio) | latest | Android SDK / emulator / device debugging |

Windows-specific notes: [`windows-development-setup.md`](./windows-development-setup.md).

## 2. Clone and install

```bash
git clone <your-fork-or-org-url>/Mudrax_CRM.git
cd Mudrax_CRM
npm install
```

## 3. Environment file

```bash
cp .env.example .env
```

Minimum to edit for local use:

- `AUTH_SECRET` — any long random string (≥32 chars)
- Keep `DATABASE_URL` / Redis defaults if you use docker-compose Postgres/Redis on localhost

Full variable reference: [`docs/operations/environment-variables.md`](../operations/environment-variables.md).

## 4. Start infrastructure + app

**Recommended (Windows / hybrid):**

```bash
npm run app:start
```

This starts Postgres + Redis in Docker, generates Prisma Client, and runs `npm run dev`.

**Or full Docker (app inside a container too):**

```bash
npm run app:start:docker
# equivalent: docker compose up -d --build
```

**Or manual:**

```bash
docker compose up -d postgres redis
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Seed prints login emails/passwords in the terminal (dev only).

## 5. Verify

```bash
npm run type-check
npm test
docker compose ps    # postgres + redis healthy
```

## 6. Mobile (optional)

See [`apps/mobile/README.md`](../../apps/mobile/README.md).
