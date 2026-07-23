# Loan Applications

## Purpose

Own the central transactional record of one loan request — qualification,
document collection, eligibility, Bank submission, and decision — from the
moment a Lead converts until the case either dies (Rejected/Withdrawn) or is
handed off to `loan-accounts` at first Disbursement. Also owns the
pre-decision funnel that feeds into a Loan Application: Loan Offer
generation, multi-bank comparison, and selection, and the Eligibility
Snapshots they are derived from. `loan-applications` is the single write path
for everything that happens to a Loan Application (and its Loan Offers)
before conversion.

## Owned Entities

- `Loan Application` - the central request record. Belongs to exactly one
  Customer and originates from exactly one Lead; references one Loan
  Product (and transitively one Bank/Bank Branch); optionally references the
  Loan Offer it was seeded from. Lifecycle: Draft -> Submitted -> Under Bank
  Review -> Approved / Rejected / Withdrawn -> (Approved) Disbursement-Pending
  -> Converted.
- `Application Status` - admin-configurable catalog answering "where is this
  Loan Application in the decisioning pipeline right now." Referenced by ID
  from Loan Application; never a hardcoded enum. Permanently distinct from
  Loan Status (owned by `loan-accounts`) and EMI Installment pay-status — see
  Business Rules.
- `Eligibility Snapshot` - an immutable, timestamped value object appended to
  a Loan Application (or generated ahead of one, referenced by a Loan Offer),
  recording the inputs used, the decision (Eligible/Ineligible/Conditional),
  computed ceilings, and a method discriminator (Manual / Rule-based / future
  automated scoring). Never edited in place; a changed input always produces
  a new snapshot.
- `Co-applicant` - a child entity of Loan Application recording the
  application-scoped facts (relationship type, declared income/obligations
  for this application, consent status) about a second/third person jointly
  responsible for the loan. References a Customer by identity for who that
  person is; never duplicates identity-resolution logic.
- `Loan Offer` - a small, dedicated Aggregate Root (a sibling to Loan
  Application, not a child of it) representing one concrete, presentable
  loan proposal derived from an Eligibility Snapshot. Multiple concurrent
  Loan Offers may exist per Lead — one per candidate Bank/Loan Product —
  enabling multi-bank comparison. Lifecycle: Generated -> Presented ->
  Selected / Declined / Expired / Superseded. Selecting a Loan Offer is the
  only action permitted to seed a new Loan Application's initial terms.

## Business Rules

- No orphan Loan Application: every one belongs to exactly one Customer and
  traces to exactly one Lead, mirroring the CRM Core "no orphan Lead" rule.
- Loan Application and Loan Account are deliberately different Aggregate
  Roots (see ADR 0005). A Loan Application converts into exactly one Loan
  Account, the first time `disbursements` records a Disbursement against it
  — never in-place mutation of one into the other, and never more than one
  Loan Account per Application.
- Rejected/Withdrawn is terminal but retained for audit and future
  re-application; a closed Loan Application never resurrects.
- Top-up and Balance Transfer are **not** separate entities — they are Loan
  Applications with an Application Type of `Top-up` or
  `Balance-Transfer-In`, carrying a reference to the originating Loan Account
  (owned by `loan-accounts`) or, for a Balance Transfer never previously
  known to Mudrax, an External Loan Reference value object (Bank name,
  masked account number, outstanding amount, as-of date) that is explicitly
  not a `banks` catalog entry. Both follow the exact same Application Status
  state machine as a fresh application, so the workflow is never duplicated.
- Eligibility Snapshot is immutable and append-only — never a permanent
  mutable entity, never a throwaway calculation, and never its own Aggregate
  Root, because it has no independent lifecycle outside the Loan Application
  or Loan Offer it was computed for. Its method discriminator is the seam
  that lets a future automated scoring capability plug in later without any
  structural redesign.
- Loan Offer is an Entity/Aggregate Root, not a Value Object (it needs
  identity and a durable, auditable status lifecycle across a comparison and
  a selection decision) and not a temporary projection (a Customer's
  selection must remain a durable historical fact, never a recomputed view
  that could silently drift). It integrates with Loan Application through
  exactly one additive, optional reference field — Loan Application's own
  shape, Application Status machine, Co-applicant, and Eligibility ownership
  are otherwise unaffected.
- Co-applicant is a child entity of Loan Application, not a standalone
  Aggregate Root (its facts only have meaning scoped to one Application) and
  not a Value Object (a Co-applicant is a specific, identifiable person, not
  an interchangeable value). The underlying person identity always resolves
  through `customers`.
- Application Status, Loan Status (owned by `loan-accounts`), and EMI
  Installment pay-status (owned by `loan-accounts`) are three permanently
  separate catalogs answering different questions at different lifecycle
  phases (pipeline-before-money / obligation-after-money /
  per-installment-payment-event) and must never be collapsed into one
  concept — the same discipline ADR 0004 established for Lead Stage vs. Call
  Feedback Status.

## Dependencies

- `customers` supplies the Customer identity every Loan Application, and
  every Co-applicant, belongs to; `loan-applications` never writes Customer
  fields directly.
- `leads` supplies the originating Lead a Loan Application converts from.
- `loan-products` (and transitively `banks`) supplies the Loan Product every
  Loan Application, Eligibility Snapshot, and Loan Offer references.
- `loan-accounts` supplies the originating Loan Account referenced by a
  Top-up or Balance-Transfer Loan Application, and is the module that reacts
  to an Approved Application's first Disbursement to open a Loan Account.
- `disbursements` is the module whose first Disbursement event against an
  Approved Loan Application triggers conversion; `loan-applications` never
  writes Disbursement state.

## Open Questions

- Whether a future automated eligibility-scoring capability should surface
  additional structured explainability fields beyond the existing method
  discriminator — acknowledged as a future hook, not designed here.

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
