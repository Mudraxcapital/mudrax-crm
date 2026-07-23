# Mudrax CRM

Production-grade Enterprise CRM for **Mudrax Capitals**, a Loan DSA (Direct Selling Associate) business. Built as a modular monolith with Clean Architecture and Domain-Driven feature modules, intended to be deployed on the company's own Linux server and used daily by real employees.

This is not a demo or a college project — see [`docs/business/BusinessRequirements.md`](docs/business/BusinessRequirements.md) for the business context and [`docs/adr/`](docs/adr) for architecture decisions.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn UI
- **Backend**: Next.js Route Handlers, Prisma ORM, PostgreSQL
- **Infrastructure**: Redis (provisioned for future sessions/caching/queues/rate limiting — not yet wired into application code)
- **Authentication**: Auth.js
- **Validation**: Zod
- **Forms**: React Hook Form
- **Local development**: Docker Desktop + Docker Compose
- **Deployment**: Linux, PM2, Nginx

## Getting Started

### Option A — Docker (recommended, matches every developer's environment)

Requires only [Docker Desktop](https://www.docker.com/products/docker-desktop/) — no local Node.js or PostgreSQL install needed.

```bash
cp .env.example .env       # fill in real local values
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000) to view the app. See
[`docs/development/local-environment.md`](docs/development/local-environment.md)
for the full guide (what each service does, everyday commands, troubleshooting).

### Option B — Native (Node.js + a local/remote PostgreSQL)

```bash
npm install
cp .env.example .env   # fill in real local values, pointing DATABASE_URL at your own Postgres
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format the codebase with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run type-check` | Run the TypeScript compiler with no emit |
| `npm run prisma:generate` | Generate the Prisma Client |
| `npm run prisma:migrate` | Run Prisma migrations in development |
| `npm run docker:up` | Build (if needed) and start the full Docker Compose environment |
| `npm run docker:down` | Stop the Docker Compose environment (keeps data volumes) |
| `npm run docker:logs` | Follow the app container's logs |
| `npm run docker:reset` | Stop the environment and delete all data volumes (clean slate) |

A pre-commit hook (Husky + lint-staged) automatically lints and formats staged files.

## Repository Structure

```
mudrax-crm/
├── docs/               # architecture decisions, module docs, business requirements
├── prisma/             # database schema (multi-file), migrations, seed
├── deploy/             # PM2, Nginx, and environment templates for the Linux server
├── scripts/            # operational scripts
├── tests/              # integration and e2e tests
├── Dockerfile          # single-app image (dev + production build targets)
├── docker-compose.yml  # local development environment (app + postgres + redis)
└── src/
    ├── app/            # Next.js App Router — routes only, kept thin
    ├── modules/        # business modules (Clean Architecture: domain/application/infrastructure/presentation)
    ├── integrations/   # plugin-based external system connectors
    ├── shared/         # cross-cutting, generic, reusable code
    ├── infra/          # app-wide infrastructure wiring (db, auth, logger, realtime)
    └── styles/         # shared theme tokens
```

Every folder contains a `README.md` explaining its purpose and what should never be placed inside it. Start with [`docs/README.md`](docs/README.md) for documentation conventions, and each module's own `README.md` under `src/modules/*` for module-specific rules.

## Architecture Principles

- **Modular Monolith** — one deployable app, internally partitioned into independent business modules that only talk to each other through public `index.ts` APIs.
- **Clean Architecture per module** — `domain -> application -> infrastructure -> presentation`, dependencies point inward only.
- **Strict TypeScript** — no implicit `any`, no unchecked indexed access.
- **One canonical location per concern** — no competing `utils/`, `helpers/`, `common/` dumping grounds.
- **Enterprise RBAC** — a User is the stable identity; Caller, Manager, Team
  Leader, Admin, and future job functions are Roles assigned to that User.
  Access is derived from Role Permissions, never from separate job-title
  modules.

See `docs/adr/` for accepted architecture decisions and `src/modules/README.md`
for the module-by-module boundaries.
