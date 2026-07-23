# Loan Products Module

Catalog of loan products offered by each bank/NBFC (Car, Home, Personal, Business, LAP, Top-Up, Balance Transfer, and future products), with interest-rate ranges, tenure options, and eligibility rules.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
