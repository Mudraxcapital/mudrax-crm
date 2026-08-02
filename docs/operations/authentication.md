# Auth.js / next-auth status

Mudrax CRM already runs **Auth.js v5** via `next-auth@5.0.0-beta.32`
(`src/infra/auth`). A further package rename / major migration is **not**
required for production hardening and would risk breaking Credentials + JWT
sessions.

## Hardening kept (non-breaking)

- Explicit session cookie names (`mudrax.session-token` /
  `__Secure-mudrax.session-token`)
- `httpOnly` + `sameSite=lax` + `secure` in production
- 8-hour session maxAge with rolling `updateAge`
- `AUTH_TRUST_HOST` for reverse-proxy deployments
- Login rate limiting via Redis (fail-open if Redis is down)
- Public health routes excluded from auth middleware
- Post-login redirect uses Next.js relative `redirect()` (not Auth.js
  `AUTH_URL`) so LAN access via a host IP does not bounce to `localhost`

## Intentionally unchanged

- JWT session strategy (required by the Credentials provider)
- Split Edge config (`config.ts`) vs Node config (`index.ts`)
