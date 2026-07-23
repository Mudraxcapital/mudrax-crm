# 0003 — Organization and Campaign Bounded Contexts

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-07-23 |

## Context

The approved domain analysis identified two business capabilities without
clear module ownership:

1. Organizational structure and operating policy were spread conceptually
   across Users, RBAC, Follow-ups, Reporting, and Telephony.
2. Campaign lifecycle, membership, allocation, and campaign-level analytics
   were treated as supporting details of Leads despite being central to
   Mudrax Capitals' operating model.

Leaving either capability without one owner would produce duplicate hierarchy,
allocation, and reporting rules across modules.

## Decision

Create two bounded contexts:

- `organization` owns Team, Branch, Region, Department, Holiday Calendar,
  Working Hours, and Escalation Rule.
- `campaigns` owns Campaign, Campaign Membership, Campaign Assignment, and
  Campaign Analytics.<sup>[†](#campaign-analytics-superseded)</sup>

`users` remains the sole owner of User identity. `rbac` remains the sole owner
of Roles, Permissions, and access policy. `leads` remains the owner of Lead
identity and sales-pipeline lifecycle. `telephony` remains the owner of call
execution and Dialer Campaign behavior.

## Consequences

- Transfers and organizational changes no longer risk changing User identity.
- Follow-up and telephony scheduling share one authoritative business calendar.
- Campaign allocation rules have one auditable owner.
- CRM Campaigns and telephony Dialer Campaigns remain separate but explicitly
  related concepts.
- Campaign Analytics is a read-only view derived from authoritative Campaign,
  Lead, Call, and outcome data.<sup>[†](#campaign-analytics-superseded)</sup>

## Future Platform Entities

Consent, Communication Preference, and Webhook Event Log are recognized in the
future domain model but are intentionally not implemented by this decision.
Their detailed responsibilities are documented in
`docs/domain/domain-model.md`.

## Non-Goals

This decision does not authorize database tables, Prisma models, APIs, UI,
authentication, or business-logic implementation.

## Amendment Note

[ADR 0004](0004-crm-core-customer-identity-and-lead-ownership.md) refines two
points of this decision without altering the Organization/Campaign split
established above: Campaign Assignment is an allocation *decision* executed
through `leads`' public API rather than a direct Lead-state write, and
Campaign Analytics is owned by `reports`, not by `campaigns`. This note is
additive only; the Context, Decision, and Consequences above are preserved
as originally accepted.

## Supersession Note — Campaign Analytics<a id="campaign-analytics-superseded"></a>

The "Campaign Analytics" ownership assigned to `campaigns` above (marked
`†`) has been superseded twice since original acceptance, and neither
supersession alters the Organization/Campaign bounded-context split itself:

1. **[ADR 0004](0004-crm-core-customer-identity-and-lead-ownership.md)**
   moved ownership of Campaign Analytics from `campaigns` to `reports`,
   still as a named, distinct entity, to avoid `campaigns` duplicating
   `reports`' reason for existing.
2. **[ADR 0009](0009-reports-and-analytics-aggregate-boundaries-and-dataset-abstraction.md)**
   dissolved "Campaign Analytics" as a standalone entity entirely, folding
   it into Metric Definition's `Domain` discriminator (realized under the
   `Lead` domain value for campaign-driven Lead outcomes) alongside Audit
   Analytics, Organization Analytics, User Analytics, Loan Analytics,
   Telephony Analytics, and Document Analytics — one discriminated model
   instead of independent per-domain analytics entities.

`campaigns` continues to supply the underlying facts (Membership, Assignment
decisions, state-change events); it has never, at any point, owned a
persisted analytics entity of its own. See
[`docs/domain/domain-model.md`](../domain/domain-model.md) rule 12 and
[ADR 0009](0009-reports-and-analytics-aggregate-boundaries-and-dataset-abstraction.md)
for the current, authoritative model.
