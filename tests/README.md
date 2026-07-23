# Tests

- `integration/` - hits a real test database through a module's public API.
- `e2e/` - Playwright tests that hit the running app.

Unit tests are co-located inside each module (e.g. `src/modules/leads/application/use-cases/__tests__/`), since `domain/` and `application/` have zero framework dependencies.
