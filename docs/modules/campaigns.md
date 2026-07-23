# Campaigns

## Purpose

Own Campaign lifecycle, User membership, and Lead allocation *decisions*.
Campaign performance analysis is explicitly not owned here — see Business
Rules and `docs/adr/0004-crm-core-customer-identity-and-lead-ownership.md`.

## Owned Entities

- Campaign
- Campaign Membership
- Campaign Assignment (the allocation decision — see Business Rules for how
  it is executed)

**Campaign Analytics is owned by `reports`, not by this module.** See
Business Rules.

## Business Rules

- Campaign membership references Users; it does not create Caller identities.
- Membership and assignment actions require Permissions from `rbac`.
- A User selected during Lead upload is automatically added to Campaign
  membership before allocation if not already active.
- Equal and percentage-based allocation are supported; allocation must be
  validated and historically auditable.
- **Campaign Assignment is a decision, not a write.** This module decides
  *how* to split Leads among members and then initiates the assignment by
  calling `leads`' public API — it never writes Lead state directly. Lead
  Assignment (the current assignee and its history) is owned solely by
  `leads`. This keeps the `campaigns` -> `leads` dependency strictly
  one-directional and avoids a circular dependency between the two modules.
- Individual Lead lifecycle, including current assignment, remains owned by
  `leads`.
- Telephony Dialer Campaign is an execution configuration owned by `telephony`,
  not a replacement for the CRM Campaign.
- **Campaign Analytics is derived, read-only, and owned by `reports`.** This
  module supplies the underlying facts (Membership, Assignment decisions,
  state-change events); it does not itself compute or store an analytics
  entity. Centralizing analytics in `reports` avoids two modules
  independently computing, and potentially disagreeing on, the same
  performance numbers.

## Dependencies

- Consumes Users from `users`, authorization from `rbac`, hierarchy/scope from
  `organization`, and Leads from `leads`.
- Initiates assignment operations through `leads`' public API; never writes
  Lead state directly.
- Supplies Campaign context to `telephony` and `reports`.
- Publishes significant changes to `activity-timeline`.

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
