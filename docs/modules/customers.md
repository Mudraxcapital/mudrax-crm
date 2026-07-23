# Customers

## Purpose

Own the permanent identity record of every person Mudrax Capitals has ever
contacted or been contacted by, independent of any single Lead, campaign, or
year. A Customer can have many Leads and, in the future, many Loan
Applications across many years. Identity is resolved from a weighted set of
identifiers rather than any single mutable contact field, so the same
Customer can be recognized even after their phone number, email, or name
changes.

## Key Entities

- `Customer` - the identity aggregate root. Lifecycle: Created (Unverified)
  -> identity strengthens as identifiers are added -> Merged (if found to
  duplicate another Customer) -> Archived. Never hard-deleted.
- `Customer Identifier` - one identity/contact proof held by a Customer:
  PAN, Aadhaar, Phone, or Email. Child entity of the Customer aggregate.
  Phone and Email support multiple concurrent and historical
  (superseded-but-retained) values; PAN and Aadhaar are singular per
  Customer.
- `Identity Confidence` - a computed value on Customer (not independently
  persisted), recalculated automatically whenever an Identifier is added.
  Tiers: Unverified -> Declared -> Verified.
- `Customer Duplicate Candidate` - flags that two or more Customer records
  probably represent the same real person, pending human review. Lifecycle:
  Detected -> Reviewed -> Merged / Dismissed.
- `Customer Merge` - the permanent, auditable record of a manual decision to
  combine two Customer identities. Immutable once recorded.

## Business Rules

- **PAN is the primary identity anchor when available.** A PAN value must be
  unique across the entire Customer base; two different Customers may never
  hold the same PAN.
- **Aadhaar is the secondary strong anchor when available.** The full Aadhaar
  number is never stored — only a one-way salted hash (for deterministic
  matching) and a masked display value (last 4 digits only), consistent with
  UIDAI storage restrictions. Same cross-Customer uniqueness rule as PAN,
  evaluated on the hash.
- **Phone numbers and email addresses are explicitly not identity anchors.**
  Multiple values per Customer are expected and normal (family-shared
  phones, work vs. personal email, recycled numbers). The same phone/email
  may legitimately appear on more than one Customer. They support day-to-day
  contact and probabilistic matching only.
- A Customer is created at **first Lead capture** — never deferred to Loan
  Application or "Won." Every Lead-creation path must resolve-or-create its
  Customer as the first step.
- Identity resolution is continuous, not one-time: adding a stronger
  identifier (PAN/Aadhaar) to an existing Customer re-triggers matching
  against the whole Customer base. A new match against a *different*
  existing Customer raises a Customer Duplicate Candidate — it is never
  auto-merged, because both records may have already accumulated
  independent history.
- Deterministic matches (PAN or Aadhaar-hash equality) resolve automatically
  to one Customer. Probabilistic matches (overlapping phone/email, or
  name/DOB similarity) always require human review via a Customer Duplicate
  Candidate — never an automatic merge.
- Customer Merge is manual only, strictly additive (the survivor inherits
  every Identifier from the merged-away Customer(s); nothing is discarded),
  and leaves a permanent tombstone/redirect so any historical reference to
  the merged-away Customer ID (today, a Lead; in the future, a Loan
  Application, Disbursement, or Document) continues to resolve correctly.
  Merge is treated as effectively irreversible and requires explicit human
  confirmation — it is never a background/automatic action.
- Customer stays deliberately lightweight — identity and contact fields
  only. No relationship-quality/status semantics live here; those belong to
  Lead/Loan Application history layered on top.

## Who Can Do What

| Role | Capability |
| --- | --- |
| Admin | Full Customer access; reviews and performs Customer Merge; views Identity Confidence and Duplicate Candidates across the business |
| Manager | Reviews Duplicate Candidates and performs merges within their span (subject to `rbac`) |
| Team Leader | Views Customer identity/history for their team's Leads |
| Caller | Views the Customer behind their assigned Leads; cannot merge or edit identifiers directly |

## Relationships

- `leads` requests Customer resolution (find-or-create via the identity
  waterfall) at Lead-creation time and references the resulting Customer;
  `leads` never writes Customer fields directly.
- `rbac` authorizes Customer Merge and identifier-management actions.
- Future Consent and Communication Preference entities (see
  `docs/domain/domain-model.md`) belong to a Customer.
- `activity-timeline` (out of scope for this document) records significant
  identity events such as merges and confidence upgrades.

## Open Questions

- What is the future, out-of-scope KYC/verification capability that upgrades
  a Customer from Declared to Verified Identity Confidence? Acknowledged as
  a future hook, not designed here.
- Should Customer Identifier's polymorphic-feeling type list (PAN/Aadhaar/
  Phone/Email) be extended with a fifth type in the future (e.g. a company
  registration number for business loans)? The type set is deliberately
  closed today.

This module currently contains architecture documentation only. No database
schema, Prisma models, APIs, UI, or business logic have been created.
