# syntax=docker/dockerfile:1.7

# ============================================================================
# Mudrax CRM — container image for the single Next.js application.
#
# Per ADR 0001 (Modular Monolith with Clean Architecture, Accepted) this
# repository is ONE deployable Next.js application — the "backend" is Next.js
# Route Handlers running inside this same app, not a separate service. This
# Dockerfile therefore builds exactly one image, in two flavors via build
# targets:
#
#   `dev`    — used by docker-compose.yml for local development. Installs
#              dependencies and generates the Prisma Client, then runs the
#              Next.js dev server (Turbopack). Source code is bind-mounted
#              over this at runtime (see docker-compose.yml), so `dev` mainly
#              exists to produce a ready `node_modules` + generated Prisma
#              Client inside the image/volume.
#
#   `runner` — a small, non-root, production-quality image (multi-stage,
#              minimal final layer, no build toolchain). Not wired into
#              docker-compose.yml (that file is for local development only)
#              — kept here so the same Dockerfile is reusable for a future
#              containerized deployment without redesigning anything.
#
# Do NOT add a second application/service to this file — a separate backend
# container would contradict ADR 0001.
# ============================================================================

ARG NODE_VERSION=20-alpine

# ---------------------------------------------------------------------------
# base — common OS-level setup shared by every stage below.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
# Prisma's query engine binary requires OpenSSL and glibc compatibility shims
# to run correctly on musl-based Alpine images.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---------------------------------------------------------------------------
# deps — install exact, locked dependencies in their own cacheable layer.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# dev — local development target (used by docker-compose.yml).
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generates the Prisma Client into node_modules so it exists even before the
# bind-mounted source (docker-compose.yml) supplies the rest of the repo.
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# builder — compiles the production build. Not used by docker-compose.yml.
# ---------------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# runner — minimal production runtime. Not used by docker-compose.yml.
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]
