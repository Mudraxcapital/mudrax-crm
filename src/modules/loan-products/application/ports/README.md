# application/ports

Interfaces the `loan-products` module needs from the outside world (e.g. notifications, storage, third-party APIs).

Concrete implementations live in `infrastructure/adapters` or in `src/integrations/*` and are wired at the composition root.

**Never put here**: concrete implementations — interfaces only.
