# Disbursements

## Purpose

Own Disbursement events — the financial fact that a Bank actually released
funds, in full or as one of several tranches, against an Approved Loan
Application — and the Commission Mudrax earns for originating and
disbursing each loan. `disbursements` is the single write path for both
Disbursement and Commission.

## Owned Entities

- `Disbursement` - one funds-release event referencing exactly one Loan
  Application, and, from the first Disbursement onward, the Loan Account it
  created/adds to. Lifecycle: Scheduled/Expected -> Disbursed -> Reconciled
  -> (rare) Reversed/Failed.
- `Commission` - a child entity of Disbursement recording the DSA commission
  earned from that specific Disbursement. Carries both a reference to the
  Commission Policy Version (owned by `banks`) that was Effective at the
  time, and its own immutable inline snapshot of the rate/slab tier,
  computed amount, and clawback rule actually applied. Lifecycle: Accrued ->
  Invoiced -> Received -> Reconciled; may later receive a Clawback
  adjustment.

## Business Rules

- Multiple partial disbursements are supported: a Loan Application/Loan
  Account can accumulate many immutable Disbursement records over time (LAP,
  construction-linked Home Loans, and Business Loans routinely disburse in
  tranches). Each Disbursement is its own immutable record; amounts, dates,
  and references become fixed once Reconciled.
- The *first* Disbursement against an Approved Loan Application creates
  exactly one Loan Account in `loan-accounts` (idempotent by Bank reference
  number — a retried event must never create a second account). Every
  subsequent Disbursement appends to that same Loan Account; "Total
  Disbursed" is always a derived sum over Disbursement records, never a
  separately-writable field.
- Commission belongs to Disbursement, not Loan Application or Loan Account:
  a Rejected/Withdrawn Application never earns anything (no meaning at that
  level), and one Commission record per Loan Account would lose the
  per-tranche traceability needed to compute a clawback against the specific
  Disbursement/Commission pair affected by an early Foreclosure.
- A Commission's inline snapshot (rate, computed amount, clawback rule) is
  the authoritative historical fact, independent of the referenced
  Commission Policy Version's continued existence — this is deliberate
  defense-in-depth. Because Commission Policy Versions are themselves
  immutable/append-only in `banks`, the reference stays safe to resolve, but
  the inline snapshot is what guarantees a Commission never depends on a
  live join to policy data that a Bank may have since revised.
- A clawback (e.g. triggered by a confirmed Foreclosure event from
  `loan-accounts`) is always evaluated against the clawback rule captured in
  that Commission's own snapshot — never a live lookup against whatever the
  Bank's *current* Commission Policy says — so a future policy change can
  never retroactively alter how an already-disbursed loan's clawback is
  judged.
- Bank-level totals (per Bank, per Loan Product, per Loan Account) are
  derived rollups for reporting, never redundant writes duplicating the
  per-Disbursement Commission record.

## Dependencies

- References the Loan Application from `loan-applications` that every
  Disbursement is recorded against.
- Publishes an event that `loan-accounts` reacts to, to open (first
  Disbursement) or update (subsequent Disbursements) the Loan Account;
  `disbursements` never writes Loan Account state directly.
- References the Commission Policy Version from `banks` effective at the
  time of each Disbursement.
- Reacts to a confirmed Foreclosure event from `loan-accounts` to post a
  Commission clawback.

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
