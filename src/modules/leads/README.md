# Leads Module

Inbound sales inquiries prior to becoming a formal Loan Application. Owns lead
identity, capture, qualification, pipeline stage, conversion, and Lead
Assignment (the current assignee and its auditable history). Every Lead
belongs to exactly one Customer from the moment it is created (see `customers`
module and `docs/domain/domain-model.md`).

`campaigns` owns Campaign, Campaign Membership, and allocation *decisions*
(equal/percentage split), but never writes Lead state directly — it
**initiates** assignment by calling this module's public API. This module is
the sole owner and sole writer of Lead Assignment. Assigned Users must have
the required Roles/Permissions through `rbac`.

Follow-up (`follow-ups` module) is its own Aggregate Root referencing a Lead
by identity — not a child entity of Lead. Lead Stage and Call Feedback
Status are permanently separate catalogs (see
`docs/domain/domain-model.md#lead-stage-vs-call-feedback-status`) and must
never be collapsed into one concept. The Excel-upload-to-Lead-creation
workflow (Import Batch -> Import Row -> Duplicate Match -> Human Resolution
-> Allocation -> Lead Creation) is owned here as a "Lead Import" capability.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
