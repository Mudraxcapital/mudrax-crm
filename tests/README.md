# Tests

| Location | Kind |
| --- | --- |
| `src/**/__tests__/` and `src/**/*.test.ts` | Unit tests (Vitest) — co-located with modules |
| `prisma/**/*.test.ts` | Prisma/seed unit tests |
| `tests/integration/` | Reserved for integration suites against a real DB |
| `tests/e2e/` | Playwright end-to-end tests against the running app |

```bash
npm test              # Vitest unit suite
npm run test:e2e      # Playwright
```
