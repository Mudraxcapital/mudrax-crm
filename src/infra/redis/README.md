# infra/redis

Optional Redis wiring for Mudrax CRM. Redis is **not** the source of truth
for durable business data — Postgres remains authoritative for job runs,
notifications, sessions (JWT), and domain state.

## Where Redis is used

| Capability | Module | Notes |
| --- | --- | --- |
| Distributed job lock | `infra/jobs` | Prefer Redis `SET NX`; fall back to Postgres advisory lock |
| Login rate limiting | `auth` login action | Fail-open if Redis is down |
| Temporary tokens | `tempStore` | Short-TTL one-time values |

## Configuration

```
REDIS_URL=redis://:password@localhost:6379
```

When `REDIS_URL` is unset or Redis is unreachable, the app continues to
operate — rate limits degrade open, jobs use Postgres locks only.
