# Loan Products

## Purpose

Own the catalog of loan products offered by each Bank/NBFC — Car, Home,
Personal, Business, LAP, and Top-Up/Balance-Transfer variants — with
interest-rate ranges, tenure options, and eligibility-rule parameters. A Loan
Product belongs to exactly one Bank; `loan-products` never lives inside the
Bank aggregate as an embedded child collection. See
[ADR 0005](../adr/0005-loan-management-aggregate-boundaries-and-lifecycle.md)
for why "Bank offers Loan Products" rather than "Bank owns Loan Products."

## Owned Entities

- `Loan Product` - one lending product definition, referencing exactly one
  Bank by identity. Lifecycle: Draft -> Active -> Suspended -> Retired. A
  Retired product remains resolvable for every historical Loan Application,
  Eligibility Snapshot, or Loan Offer that already referenced it.

## Business Rules

- Product type is drawn from a closed, admin-extendable catalog (Car Loan,
  Home Loan, LAP, Personal Loan, Business Loan, BT/Top-up variants, and
  future types) — never a hardcoded enum.
- Bank + product type + variant should be unique within the catalog.
- Retiring a Loan Product never cascades into or invalidates historical
  references from Loan Application, Loan Account, or Eligibility Snapshot.
- Loan Product is its own Aggregate Root specifically because it changes far
  more often and independently of Bank master data (rate/tenure/eligibility
  revisions); embedding it inside Bank would force loading and effectively
  locking the whole Bank aggregate on every product edit.

## Dependencies

- References exactly one Bank (owned by `banks`) by identity.
- Referenced by `loan-applications` — the chosen product on a Loan
  Application, an Eligibility Snapshot, and a Loan Offer.
- Referenced by `loan-accounts` — product terms are snapshotted at Loan
  Account creation.

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
