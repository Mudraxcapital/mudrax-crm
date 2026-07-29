# Infra

App-wide infrastructure wiring - stateful connections to the outside world that exist exactly once per running process (one DB pool, one auth config, one logger, one real-time gateway, one background-jobs worker).

Modules depend on `infra/` only through interfaces defined in their own `application/ports`, never directly, so a module's tests can substitute a fake.

**Never put here**: business logic or anything module-specific (a telephony provider adapter belongs in `src/integrations/telephony`, not here).

| Seam | Status |
| --- | --- |
| `db/` | Prisma client singleton |
| `auth/` | Auth.js / session guards |
| `jobs/` | Durable Postgres background jobs (follow-up reminders/escalations, notification queue) |
| `redis/` | Optional Redis: job locks, login rate limits, temp tokens |
| `logger/` | Reserved (Phase 9 structured logging) |
| `realtime/` | Reserved |
| `middleware/` | Shared middleware helpers |
| `company/` | Single-company id resolver |
