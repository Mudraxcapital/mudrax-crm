# 0004 — CRM Core: Customer Identity, Lead Ownership, and Campaign/Reports Boundaries

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-07-24 |

## Context

Following ADR 0003, `campaigns` owned Campaign, Campaign Membership, Campaign
Assignment, and Campaign Analytics, while `leads` owned Lead identity and
sales-pipeline lifecycle. Review of the CRM Core bounded context (Customer,
Lead, Campaign, and their immediate supporting entities) surfaced five
unresolved problems:

1. Customer identity had no defined strategy. Nothing prevented an implicit,
   informal reliance on phone number as the identity anchor — unworkable for
   a Loan DSA business, since phone numbers change, are recycled, and are
   frequently shared within a household, while a Customer relationship is
   expected to span years and multiple loan products.
2. It was undocumented whether a Lead's current assignee was written by
   `leads` or by `campaigns`, creating a real risk of two aggregates writing
   the same fact and a circular dependency between the two modules.
3. `campaigns` owned "Campaign Analytics" as a derived entity, duplicating
   the reason `reports` exists and risking two disagreeing sources of truth
   for the same metrics.
4. Follow-up/Call Later scheduling had no stated aggregate boundary relative
   to Lead, risking a duplicated "next action" fact between two owners.
5. The Excel-upload-to-Lead-creation workflow (duplicate detection, past-case
   resolution, allocation) had no owning entity, despite being one of the
   most business-critical, auditable workflows in the BRD.

## Decision

### Customer identity strategy

`customers` owns Customer identity, anchored on a **weighted set of
identifiers** rather than any single mutable contact field:

- **PAN** — primary identity anchor when available; unique across the
  Customer base.
- **Aadhaar** — secondary strong anchor when available; the full number is
  never stored, only a one-way salted hash (for matching) and a masked
  display value (last 4 digits), consistent with UIDAI storage restrictions.
- **Phone numbers (multiple, including historical/superseded values)** and
  **email addresses (multiple)** — supporting, non-exclusive contact and
  probabilistic-matching signals. Neither is unique across Customers and
  neither is sufficient on its own to prove identity.
- **Identity Confidence** — a computed tier (Unverified -> Declared ->
  Verified) reflecting how strong the current evidence of identity is;
  recalculated automatically whenever an identifier is added.
- **Customer Duplicate Candidate** — raised whenever two Customer records
  probably represent the same person (deterministic PAN/Aadhaar collisions
  resolve automatically; probabilistic phone/email/name overlaps always
  require human review).
- **Customer Merge** — a manual, auditable, additive operation. The
  merged-away Customer ID becomes a permanent tombstone/redirect; no
  historical reference is ever orphaned.

A Customer is created at first Lead capture (Excel row, API webhook, WhatsApp
inbound) by running this identity-resolution strategy — never deferred to
Loan Application or "Won." Phone number is explicitly demoted from identity
anchor to contact/history signal.

### Lead ownership

Every Lead belongs to exactly one Customer from the moment it is created —
there is no orphan Lead.

`leads` is the sole owner and sole writer of **Lead Assignment** (the current
assignee and the auditable assignment history). `campaigns` may **initiate**
an assignment operation (bulk equal/percentage allocation) by calling the
`leads` public API; it never writes Lead state directly. This keeps the
dependency strictly one-directional (`campaigns` -> `leads`) and prevents the
circular-dependency risk identified in review.

**Follow-up** is its own Aggregate Root within the CRM Core boundary owned by
`leads` — not a child entity of the Lead aggregate. Follow-up has an
independent lifecycle (Scheduled -> Due -> Completed/Missed -> Escalated) and
is the natural target of portfolio-wide and reassignment queries that would
be inefficient if Follow-up were buried inside every individual Lead. Lead
retains only a denormalized "next action" projection, maintained exclusively
by a Follow-up domain-event listener.

**Lead Stage** and **Call Feedback Status** remain permanently separate
catalogs. Lead Stage answers "where is this Lead in the pipeline"; Call
Feedback Status answers "what happened on this specific call attempt."
Multiple Call Feedback records accumulate against a Lead without changing its
Stage, and Stage changes are not mechanically derived from the latest Call
Feedback value.

### Campaign and Reports boundary

`campaigns` retains ownership of Campaign, Campaign Membership, and
allocation logic (the decision of *how* to split Leads among members), but
**does not own Campaign Analytics**. Campaign Analytics — assignment
distribution, calling progress, connectivity, Lead outcomes, conversion —
is owned by `reports`, computed from the authoritative facts `campaigns`,
`leads`, and `telephony` publish. This removes the duplicate-source-of-truth
risk of two modules independently computing the same performance numbers.

### Import Batch workflow

The Excel-upload-to-Lead-creation workflow is owned by `leads` as a distinct
"Lead Import" capability, expressed as: **Import Batch -> Import Row ->
Duplicate Match -> Human Resolution -> Allocation (via `campaigns`) -> Lead
Creation**. Import Batch and Import Row are immutable audit records once
committed. Duplicate Match records a resolution decision that is never
silently overwritten.

## Consequences

- Mudrax's Customer identity model now matches how the banks/NBFCs it
  originates loans for identify a person (PAN/Aadhaar), removing a future
  reconciliation problem when disbursement/loan-account tracking activates.
- A Customer's multi-year relationship survives a phone number change,
  because identity resolution is never solely dependent on phone.
- `leads` and `campaigns` have a strictly one-directional dependency for
  assignment; no circular-import risk.
- `reports` becomes the single source of truth for Campaign performance
  metrics; `campaigns` stays a pure transactional/write-side module.
- Follow-up can be queried, reassigned, and escalated efficiently across a
  whole portfolio without loading every Lead aggregate.
- The duplicate/past-case Excel workflow described in the Business
  Requirements Document (§9.3-9.4) now has an explicit, auditable owner and
  process shape.

## Alternatives Considered

- **Keep phone number as the identity anchor**: rejected — phone numbers are
  recycled and change over a Customer's multi-year relationship with the
  business; this would permanently fragment a returning Customer's history.
- **Let `campaigns` write Lead assignment directly**: rejected — creates a
  two-writer risk on the same fact and a circular dependency between
  `campaigns` and `leads`.
- **Keep Campaign Analytics inside `campaigns`**: rejected — duplicates
  `reports`' reason for existing and risks two disagreeing performance
  numbers for the same Campaign.
- **Model Follow-up as a child entity of Lead**: rejected — Follow-up's
  dominant queries (due-today across a portfolio, bulk reassignment) are
  Follow-up-centric, not Lead-centric, and its lifecycle does not need to
  share the Lead aggregate's consistency boundary.
- **Merge Lead Stage and Call Feedback Status into one concept**: rejected —
  they answer different business questions at different granularities and
  BRD's own "Connected when duration > 0s" default rule would corrupt Stage
  semantics if merged.

This ADR defines architecture only. It does not authorize database tables,
Prisma models, SQL, APIs, or UI.
