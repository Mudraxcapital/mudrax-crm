# Auth Module

Authentication domain/application rules (login attempts, session policy, account lockout). Auth.js framework wiring itself lives in `src/infra/auth`.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
