# 0005 — Loan Management: Aggregate Boundaries and Lifecycle

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-07-24 |

## Context

CRM Core (ADR 0004) ends at Lead conversion. Following approval of CRM Core,
the Loan Management bounded context — Loan Product, Bank, Bank Branch, Loan
Application, Loan Account, Disbursement, Commission, EMI Schedule, EMI
Installment, Foreclosure, Top-up, Balance Transfer, Eligibility,
Co-applicant, Loan Status, and Application Status — was designed and
reviewed. Nine unresolved modeling questions were identified:

1. Whether Loan Application and Loan Account should be one aggregate or two.
2. Whether a Loan Product belongs to a Bank (embedded) or a Bank offers Loan
   Products (referenced).
3. Whether Top-up and Balance Transfer need their own entity type or can
   reuse the Loan Application workflow.
4. Whether EMI Schedule needs to be an independent Aggregate Root or can
   live inside Loan Account.
5. Whether Disbursement is a single record or must support multiple partial
   tranches.
6. Whether Commission belongs to Loan Application, Loan Account, or
   Disbursement.
7. Whether Eligibility is a permanent entity, a temporary calculation, a
   value object, or a separate aggregate.
8. Whether Co-applicant is a separate aggregate, a child entity, or a value
   object.
9. Where a future Loan Offer concept (multi-bank comparison, future
   recommendation scoring, Customer selection) sits relative to Eligibility
   and Loan Application, and how Commission can remain historically
   immutable while a Bank's commission terms change over time.

Leaving any of these unresolved would risk exactly the kind of ownership
ambiguity CRM Core already had to correct once (ADR 0004): two aggregates
writing the same fact, a God-aggregate mixing unrelated consistency
boundaries, or a future feature (multi-bank comparison, AI eligibility
scoring, recovery workflows) forcing a disruptive redesign because today's
model gave it no seam to attach to.

## Decision

### Loan Application and Loan Account are separate Aggregate Roots

`loan-applications` owns Loan Application as a pre-money decisioning
workflow (multi-step, amendable, able to die as Rejected/Withdrawn without
ever creating a financial obligation). `loan-accounts` owns Loan Account as
a post-money financial-servicing record (an outstanding balance, an EMI
Schedule, a multi-year lifecycle). The two connect at exactly one point:
`disbursements`' first Disbursement event against an Approved Loan
Application creates exactly one Loan Account, linked by an immutable
`originatingApplicationId` reference. There is no in-place mutation of one
aggregate into the other, and a Loan Account is created at most once per
Loan Application.

### Bank offers Loan Products

Loan Product is its own Aggregate Root, owned by `loan-products`, that
references Bank by identity. Bank does not own Loan Product as an embedded
child collection. Loan Products change far more often and independently of
Bank master data (rate/tenure/eligibility revisions); embedding them inside
Bank would force loading, and effectively locking, the whole Bank aggregate
on every product edit, and would blur the module boundary between `banks`
and `loan-products`.

### Top-up and Balance Transfer are new Loan Applications, not new entities

Both are ordinary Loan Applications carrying an Application Type
discriminator (`Top-up` / `Balance-Transfer-In`) and a contextual reference:
for Top-up, the existing Loan Account being added to; for Balance Transfer,
either an existing Mudrax-known Loan Account or an External Loan Reference
value object (Bank name, masked account number, outstanding amount, as-of
date) for a loan Mudrax never previously touched. Both go through the
identical Loan Application workflow — eligibility, submission, decision,
disbursement — rather than a duplicated parallel state machine. On
conversion, a Top-up opens a new Loan Account and marks the prior one
"Superseded-by-Topup"; a Balance Transfer-In opens a new Loan Account and,
where an internal Loan Account was referenced, marks it "Transferred-Out."
Whether a Top-up should fully refinance/close the prior Loan Account or
leave it running independently alongside the new one is **not** resolved by
this ADR — see Open Questions.

### EMI Schedule lives inside the Loan Account aggregate

EMI Schedule and EMI Installment are owned by `loan-accounts` as a child
collection inside the Loan Account aggregate's consistency boundary — not an
independent Aggregate Root. EMI Schedule has no existence or invariants
independent of its Loan Account, unlike Follow-up (ADR 0004), which was
pulled out of Lead specifically because its dominant queries were
portfolio-wide, not Lead-centric. EMI Schedule's dominant queries
("outstanding balance," "regenerate after part-prepayment") are
Account-centric. Portfolio-wide "due today across every account" queries are
served by a lightweight read projection owned by `loan-accounts`, the same
pattern Lead already uses for its denormalized "next action" field, rather
than by promoting EMI Schedule to a top-level aggregate.

### Disbursement supports multiple partial tranches

`disbursements` owns Disbursement as a one-to-many relationship against a
Loan Application/Loan Account: real lending practice (LAP, construction-
linked Home Loans, Business Loans) routinely disburses in tranches. Each
Disbursement is its own immutable record, matching this codebase's
established append-only-audit convention (Customer Merge, Import Batch/Row).
Only the *first* Disbursement against an Approved Loan Application creates
the Loan Account; Disbursement processing must be idempotent by Bank
reference number so a retried event never creates a second account for the
same Application. "Total Disbursed" is a derived sum over Disbursement
records, never a separately-writable field.

### Commission belongs to Disbursement, versioned against a Commission Policy

Commission is owned by `disbursements` as a child of Disbursement — not of
Loan Application (nothing is earned until money moves; a Rejected/Withdrawn
Application never earns anything) and not of Loan Account (would lose the
per-tranche traceability needed to compute a clawback against the specific
Disbursement/Commission pair affected by an early Foreclosure).

To let Banks evolve their commission terms over time without corrupting
history, `banks` additionally owns **Commission Policy Version**: a
versioned, append-only ruleset (rate/slab structure, effective dates,
clawback window/rule) per Bank, optionally scoped to one Loan Product. A
policy change always creates a new version; no version is ever edited after
becoming Effective. Each Commission references the Commission Policy Version
that was Effective at the time of its Disbursement, and additionally carries
its own **immutable inline snapshot** of the rate/slab, computed amount, and
clawback rule actually applied. This is deliberate defense-in-depth: even
though Commission Policy Versions are themselves immutable/append-only, a
historical Commission's economic facts do not depend on that discipline
holding forever, or on a live join to policy data a Bank may have since
revised. A clawback (e.g. triggered by a confirmed Foreclosure) is always
evaluated against the rule captured in the Commission's own snapshot, never
against the Bank's current policy.

### Eligibility is an immutable snapshot value object, not a permanent entity or a separate aggregate

`loan-applications` owns Eligibility Snapshot: an immutable, timestamped
value object appended to a Loan Application (or referenced by a Loan Offer)
recording the inputs used, the decision, computed ceilings, and a method
discriminator (Manual / Rule-based / future automated scoring). It is not a
temporary/throwaway calculation (audit requires the exact inputs and
decision to remain retrievable), not a permanent mutable entity (a changed
input must never edit an old judgment in place — it appends a new snapshot,
the same pattern as Customer Merge and Import Batch/Row), and not a separate
Aggregate Root (it has no independent lifecycle or query pattern outside the
Loan Application/Loan Offer it was computed for). The method discriminator
is the deliberate seam that lets a future automated scoring capability plug
in later as just another snapshot method, with no structural redesign.

### Co-applicant is a child entity of Loan Application

`loan-applications` owns Co-applicant as a child entity of the Loan
Application aggregate — not a standalone Aggregate Root (its facts —
relationship type, income/obligations declared for *this* application,
consent status — only have meaning scoped to one Application) and not a
Value Object (a Co-applicant is a specific, identifiable person, not an
interchangeable value). The person behind a Co-applicant always resolves
through `customers`, exactly like the primary applicant; `loan-applications`
never duplicates identity-resolution logic.

### Loan Offer is a new Aggregate Root between Eligibility and Loan Application

`loan-applications` owns Loan Offer as a small, dedicated Aggregate Root — a
sibling to Loan Application, not a child of it. A Loan Offer is generated
from an Eligibility Snapshot and represents one concrete, presentable loan
proposal (amount, rate, tenure, Bank, Loan Product). It is an Entity, not a
Value Object (it needs independent identity and a status lifecycle that
survives a comparison window and a selection decision) and not a temporary
projection (the Customer's selection must remain a durable, auditable fact,
not a recomputed view that could silently drift). Multiple concurrent Loan
Offers may exist per Lead — one per candidate Bank/Loan Product — which is
what makes multi-bank comparison a simple query grouped by Lead rather than
a redesign. Its lifecycle is Generated -> Presented -> Selected / Declined /
Expired / Superseded; selecting an Offer is the only action permitted to
seed a new Loan Application's initial terms, via one new, additive, optional
reference field on Loan Application (`originatingLoanOfferId`). Nothing else
about Loan Application's shape, Application Status machine, Co-applicant
ownership, or Eligibility Snapshot history changes. A future AI
recommendation attaches to a Loan Offer as an optional, additive annotation
— never a required part of its core shape.

### Status catalogs stay separate

Application Status (owned by `loan-applications`), Loan Status (owned by
`loan-accounts`), and EMI Installment pay-status (owned by `loan-accounts`)
remain three permanently separate catalogs, answering different questions at
different lifecycle phases — pipeline-before-money, obligation-after-money,
and per-installment-payment-event, respectively — the same discipline ADR
0004 established for Lead Stage vs. Call Feedback Status.

## Consequences

- Loan Application and Loan Account can evolve independently (different
  write frequency, different consistency needs) without one module's schema
  changes forcing changes in the other.
- Loan Product edits never contend with Bank master-data edits.
- Top-up and Balance Transfer reuse the entire Loan Application workflow
  (eligibility, submission, decision, disbursement) instead of duplicating
  it as parallel state machines.
- EMI Schedule/Installment stay simple to reason about — always loaded and
  changed together with their one Loan Account — while portfolio-wide due-
  installment queries are still efficient via a dedicated read projection.
- Multiple partial Disbursements are fully supported without ever mutating
  a prior Disbursement record, preserving a complete audit trail.
- Commission remains permanently correct and self-contained per
  Disbursement even as a Bank's Commission Policy evolves for future loans;
  clawback calculations always use the rule that was actually in force at
  accrual time.
- Eligibility's full history is preserved and explainable, and is ready to
  accept a future automated scoring method without any structural change.
- Co-applicant identity is never duplicated outside `customers`.
- Loan Offer gives multi-bank comparison and a future recommendation
  capability a real home, without requiring any change to Loan Application
  itself.

## Alternatives Considered

- **Merge Loan Application and Loan Account into one aggregate**: rejected —
  would force pre-decision workflow edits and post-money financial-servicing
  edits to share one consistency boundary, and would make "Rejected
  Application never produces an Account" awkward to express.
- **Embed Loan Product as a child collection of Bank**: rejected — Loan
  Product changes far more often than Bank master data; embedding would
  force locking the whole Bank aggregate on every product edit.
- **Model Top-up/Balance Transfer as their own entity types**: rejected —
  would duplicate the entire Loan Application workflow as parallel state
  machines for what is, business-wise, "another loan application with extra
  context."
- **Promote EMI Schedule to its own Aggregate Root**: rejected — it has no
  existence or invariants independent of its Loan Account; unlike Follow-up,
  its dominant queries are Account-centric, not portfolio-wide.
- **Model Disbursement as a single mutable record**: rejected — real
  tranche-based disbursal practice needs an audit trail of every release,
  and mutating one record repeatedly would destroy that history.
- **Attach Commission to Loan Application or Loan Account**: rejected — see
  Decision; neither preserves the per-tranche traceability a clawback needs,
  and Loan Application can die without ever earning anything.
- **Model Eligibility as a mutable entity or a separate Aggregate Root**:
  rejected — a mutable entity would corrupt historical judgments when inputs
  change; a separate aggregate has no independent lifecycle to justify one.
- **Model Co-applicant as a standalone aggregate or a Value Object**:
  rejected — its facts are application-scoped (fails the standalone-
  aggregate test) and it represents a specific identifiable person (fails
  the value-object test).
- **Model Loan Offer as a Value Object or a temporary projection**: rejected
  — a Value Object cannot carry the identity and status lifecycle a
  Customer's durable selection decision requires; a temporary projection
  could silently drift and would not preserve an auditable comparison/
  selection history.

## Open Questions

- Whether a Top-up should fully refinance/close the originating Loan Account
  into one new account, or leave the old account running independently
  alongside a new one — requires business sign-off before implementation.
- Whether Bank Branch should be promoted from a child entity of Bank to its
  own Aggregate Root if per-branch operational data (login SLAs,
  relationship-manager performance) becomes a first-class requirement.

This ADR defines architecture only. It does not authorize database tables,
Prisma models, SQL, APIs, or UI.
