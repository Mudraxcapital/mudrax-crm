# Leads Module

Inbound sales inquiries prior to becoming a formal Loan Application. Owns lead
identity, capture, qualification, pipeline stage, and conversion. Campaign
membership, campaign-level allocation, and campaign assignment history belong
to `campaigns`; assigned Users must have the required Roles/Permissions through
`rbac`.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
