# tests/e2e

Playwright end-to-end suite for production-hardening workflows.

```bash
npm run db:seed          # seeded credentials required
npm run test:e2e         # starts Next.js on E2E_PORT (default 3010) unless skipped
npm run test:e2e:ui      # interactive Playwright UI
```

Config: [`playwright.config.ts`](../../playwright.config.ts) (`testDir: ./tests/e2e`).

Set `E2E_SKIP_WEBSERVER=1` only when a matching `AUTH_URL` server is already running.
