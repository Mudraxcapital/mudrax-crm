# Banks

## Purpose

Own lending-partner (Bank/NBFC) master data — identity, active status, Bank
Branches, and the versioned Commission Policy that governs how DSA commission
is calculated against that Bank's Disbursements. `banks` is the sole owner of
this data; it never writes Loan Product, Loan Application, or Disbursement
state.

## Owned Entities

- `Bank` - the lending partner/NBFC master record. Lifecycle: Onboarded ->
  Active -> Suspended -> Offboarded. Never hard-deleted — a decade of loan
  history must keep resolving to the Bank that funded it.
- `Bank Branch` - a specific operating location of a Bank, used for loan case
  login/processing (e.g. "HDFC — Andheri"). Child entity of the Bank
  aggregate. Lifecycle: Added -> Active -> Closed. Always referred to as
  "Bank Branch," never bare "Branch" — `organization`'s Branch is a distinct,
  Mudrax-internal concept and must never be confused with a lending
  partner's branch.
- `Commission Policy Version` - the versioned, immutable ruleset (rate/slab
  structure, effective dates, clawback window/rule) governing commission
  calculation for a Bank, optionally scoped to one Loan Product. Lifecycle:
  Drafted -> Effective -> Superseded. A policy change always creates a new
  version; no version is ever edited after it becomes Effective.

## Business Rules

- Bank identifier/name is unique across the catalog.
- Suspending a Bank blocks new Loan Products/Applications from selecting it
  but never retroactively alters Loan Accounts already open with it.
- At most one Commission Policy Version may be Effective for a given
  Bank/Loan-Product combination at any point in time.
- A superseded Commission Policy Version remains permanently resolvable so
  every historical Commission that referenced it stays explainable — it is
  never deleted or edited in place.
- Commission Policy Version changes never retroactively alter a Commission
  already accrued in `disbursements`. See `disbursements.md` and
  [ADR 0005](../adr/0005-loan-management-aggregate-boundaries-and-lifecycle.md)
  for how historical Commission stays immutable regardless of later policy
  changes.

## Dependencies

- Referenced by `loan-products` — each Loan Product belongs to exactly one
  Bank.
- Referenced by `loan-applications` and `loan-accounts` for Bank/Bank Branch
  context on an Application or Account.
- Referenced by `disbursements` — each Commission snapshots the Commission
  Policy Version effective at the time of its Disbursement.
- `banks` never writes to any other module; it is purely a supplier of
  reference and agreement data.

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
