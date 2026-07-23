# Loan Accounts

## Purpose

Own the post-disbursement lifecycle of a loan — the financial obligation a
Customer holds with a Bank once money has moved — including EMI Schedule,
EMI Installment, and Foreclosure. `loan-accounts` is the anchor that a future
Top-up or Balance-Transfer Loan Application references, and the single write
path for everything that happens to a Loan Account after it opens.

## Owned Entities

- `Loan Account` - created from exactly one originating Loan Application
  (immutable back-reference, 1:1) the first time `disbursements` records a
  Disbursement against that Application. Belongs to one Customer, one
  Bank/Bank Branch, and a snapshot of the Loan Product terms at creation.
  Lifecycle: Opened -> Active -> (future) Delinquent -> Closed-Normal /
  Closed-Foreclosed / Transferred-Out / Superseded-by-Topup -> Archived.
- `Loan Status` - admin-configurable catalog answering "what state is this
  Loan Account in right now." Referenced by ID from Loan Account;
  permanently distinct from Application Status (owned by
  `loan-applications`) and EMI Installment pay-status.
- `EMI Schedule` - the full installment-by-installment repayment plan for a
  Loan Account, generated at disbursement and regenerated on
  restructure/part-prepayment/foreclosure. Modeled as a child collection
  inside the Loan Account aggregate's consistency boundary — deliberately
  not an independent Aggregate Root (see ADR 0005). Lifecycle: Generated ->
  Active/Current -> Superseded -> Closed. Regeneration supersedes; it never
  deletes history.
- `EMI Installment` - one due repayment line (due date, principal/interest
  split, due amount, pay status), child of EMI Schedule. The due-amount
  definition is immutable once generated; only pay-status and paid-date
  mutate over time.
- `Foreclosure` - a child entity of Loan Account recording a decision to pay
  off the entire outstanding balance ahead of schedule. Lifecycle: Requested
  -> Quote Generated -> Paid -> Confirmed -> (Loan Account ->
  Closed-Foreclosed). A Confirmed Foreclosure is immutable and terminal for
  that Loan Account.

## Business Rules

- A Loan Account cannot exist without an Approved, at-least-first-tranche-
  Disbursed Loan Application behind it, and is created exactly once per Loan
  Application — `disbursements`' first Disbursement event triggers creation;
  retried/duplicate Disbursement events must never create a second Loan
  Account for the same Application.
- Closure (Foreclosure, natural completion, Transferred-Out, or
  Superseded-by-Topup) is terminal — no reactivation. Any further lending
  relationship for that Customer is a new Loan Application producing a new
  Loan Account.
- EMI Schedule stays inside the Loan Account aggregate because it has no
  existence or invariants independent of its account (contrast with
  Follow-up, which was pulled out of Lead precisely because its dominant
  queries were portfolio-wide). Portfolio-wide "due today across every
  account" queries are served by a lightweight read projection owned by
  `loan-accounts`, not by promoting EMI Schedule to a top-level aggregate.
- Foreclosure amount is always computed fresh from the EMI Schedule's
  outstanding principal plus any Bank-specific foreclosure charge at the
  time of request — never precomputed or stale.
- A confirmed Foreclosure may trigger a Commission clawback in
  `disbursements` via a domain event — this is an explicit, accepted
  eventually-consistent cross-module dependency, never a synchronous
  cross-aggregate transaction.
- A Top-up marks its originating Loan Account "Superseded-by-Topup"; a
  Balance Transfer-In marks the referenced internal Loan Account (if any)
  "Transferred-Out." Whether a Top-up fully refinances/closes the old
  account or the old account continues independently alongside the new one
  remains an **open business question** — this design only cleanly supports
  the refinance/close model today.
- Loan Status, Application Status, and EMI Installment pay-status are three
  permanently separate catalogs and must never be collapsed into one
  concept.

## Dependencies

- Created in reaction to a Disbursement event from `disbursements`; never
  the reverse.
- References the originating Loan Application from `loan-applications`
  (immutable, 1:1).
- References Bank/Bank Branch from `banks` and the Loan Product snapshot
  from `loan-products`.
- Referenced by a future Top-up or Balance-Transfer Loan Application in
  `loan-applications` as the "originating account."
- A confirmed Foreclosure publishes an event that `disbursements` reacts to
  for Commission clawback.

## Open Questions

- Whether Top-up should refinance/close the originating Loan Account into
  one new account, or leave it running independently alongside a new one —
  requires business sign-off before implementation.

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
