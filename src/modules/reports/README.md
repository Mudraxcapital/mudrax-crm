# Reports Module

Cross-module reporting — aggregates data from other modules' public APIs to produce operational reports.

Owns **Campaign Analytics** (assignment distribution, calling progress,
connectivity, Lead outcomes, conversion) as a derived, read-only view
computed from facts published by `campaigns`, `leads`, and `telephony`.
`campaigns` remains a pure transactional/write-side module and does not own
its own analytics entity — see
`docs/adr/0004-crm-core-customer-identity-and-lead-ownership.md`.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
