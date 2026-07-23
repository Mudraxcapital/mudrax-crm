# Follow Ups Module

Scheduled follow-up/callback tasks tied to leads and customers, including reminders and escalation.

Follow-up is modeled as its own Aggregate Root, referencing a Lead (and
transitively its Customer) by identity — it is **not** a child entity of the
Lead aggregate. Its dominant queries ("what's due today across my whole
portfolio," "reassign this absent Caller's follow-ups") are Follow-up-centric
rather than Lead-centric, and its lifecycle (Scheduled -> Due ->
Completed/Missed -> Escalated) does not need to share the Lead aggregate's
consistency boundary. `leads` retains only a denormalized "next action"
projection, updated exclusively by a Follow-up domain-event listener — no
other code path may write it. See `docs/modules/follow-ups.md` and
`docs/adr/0004-crm-core-customer-identity-and-lead-ownership.md`.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
