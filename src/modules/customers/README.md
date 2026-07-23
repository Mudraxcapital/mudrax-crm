# Customers Module

The permanent record of every person/entity the company has done business with, independent of any single lead or loan application. A Customer can have many Leads and many Loan Applications across many years.

## Identity Strategy

Customer identity is anchored on a **weighted set of identifiers**, not on
any single mutable contact field:

- **PAN** - primary identity anchor when available; unique across the entire
  Customer base.
- **Aadhaar** - secondary strong anchor when available; the full number is
  never stored, only a one-way salted hash (for matching) and a masked
  display value (last 4 digits only).
- **Phone numbers (multiple, including historical/superseded values) and
  email addresses (multiple)** - supporting, non-exclusive contact and
  probabilistic-matching signals. Neither is unique across Customers and
  neither is sufficient alone to prove identity.
- **Identity Confidence** - a computed tier (Unverified -> Declared ->
  Verified), recalculated automatically whenever an identifier is added.
- **Customer Duplicate Candidate** - raised for probabilistic matches
  (overlapping phone/email) or when a newly-added PAN/Aadhaar matches a
  different existing Customer; always resolved by a human, never
  auto-merged.
- **Customer Merge** - a manual, additive, permanently auditable operation.
  The merged-away Customer ID becomes a tombstone/redirect so no historical
  reference is ever orphaned.

A Customer is created at first Lead capture, never deferred to "Won." Phone
number is explicitly not the identity anchor — see
`docs/modules/customers.md` and
`docs/adr/0004-crm-core-customer-identity-and-lead-ownership.md` for the full
rationale.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
