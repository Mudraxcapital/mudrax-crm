# infra/jobs

Durable, restart-safe background job runner for Mudrax CRM.

## Mechanism

- **Postgres `jobs.job_runs`** — every execution is logged; unique
  `(jobType, idempotencyKey)` prevents duplicate reminders/escalations.
- **Postgres advisory lock / Redis lock** — one tick at a time across
  processes (Redis preferred when available; Postgres fallback).
- **Timezone-aware** — organization.timezone (default `Asia/Kolkata`) drives
  calendar-day reminder and escalation windows.
- **Handlers** call existing module public APIs only (`follow-ups`,
  `notifications`) — no business-logic fork.

## Jobs

| Job type | Purpose |
| --- | --- |
| `follow-up.lifecycle` | Mark due / missed; escalate FOLLOW_UP → Team Lead (next day); CALL_LATER → TL + Manager |
| `follow-up.reminder` | Same-day IN_APP reminder to assignee (idempotent per follow-up + date) |
| `follow-up.escalation-notify` | Deduped escalation notification sends |
| `notifications.process-queue` | Drain scheduled/pending notification queue |
| `notifications.retry-failed` | Retry failed deliveries (existing use-case) |
| `jobs.retry-failed` | Report / surface FAILED runs eligible for backoff retry |

## How to run

| Mode | How |
| --- | --- |
| Dedicated process (recommended) | `npm run jobs:worker` |
| HTTP cron tick | `POST /api/internal/jobs/tick` with `Authorization: Bearer $JOBS_CRON_SECRET` |
| In-process (`next start` only) | `JOBS_INLINE=true` + `JOBS_ENABLED=true` |
| One-shot tick | import `runJobsTick` from `@/infra/jobs` |

> `next dev` (Turbopack) does not auto-start jobs from instrumentation — the
> runner pulls Prisma/Redis into the instrumentation graph. Use the worker
> process or the HTTP tick endpoint instead.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `JOBS_ENABLED` | prod=`true`, else off | Auto-start in-process worker |
| `JOBS_INTERVAL_MS` | `60000` | Tick interval |
| `JOBS_KEEP_ALIVE` | unset | Set by `jobs:worker` so the process stays alive |
| `JOBS_WORKER_ID` | auto | Worker identity written to job_runs.lockedBy |

## Idempotency

- Reminders: `reminder:{followUpId}:{recipientId}:{YYYY-MM-DD}`
- Escalation notifies: `escalation_*:{followUpId}:{recipientId}:{date}`
- Periodic ticks: `tick:{YYYY-MM-DDTHH:mm}` per job type (at most one success per minute)
