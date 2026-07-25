# Development seed data

Populates a freshly migrated database with production-quality development
seed data: lookup/catalog tables, the Organization structure, RBAC, one
bootstrap Administrator, and realistic demo data. Nothing here changes the
Prisma schema or adds a backend API — it only inserts rows through the
existing generated Prisma Client.

## Running it

```bash
npm run db:seed
```

This runs `prisma db seed`, which Prisma resolves to the `migrations.seed`
command configured in `prisma.config.ts` (`tsx prisma/seed/index.ts`). It
also runs automatically after `prisma migrate dev` / `prisma migrate reset`.

Prerequisite: `DATABASE_URL` must be set (copy `.env.example` to `.env` —
see `docs/setup/windows-development-setup.md`) and all migrations must
already be applied.

## Idempotency

Every step **upserts**. Re-running `npm run db:seed` any number of times
converges to the same rows — it never creates duplicates and never errors
on a second run:

- Rows with a real business unique key already declared in the accepted
  schema (e.g. `Organization.code`, `Branch{organizationId, code}`,
  `Role{organizationId, name}`, `Permission.code`,
  `LeadSource{organizationId, name}`, ...) upsert on that key.
- The handful of demo rows with no natural unique key at all (`Customer`,
  `CustomerIdentifier`, `Lead`, `FollowUp`, `LoanApplication`) get a
  deterministic UUIDv5 id from `lib/determinism.ts`'s `seedId()`, keyed off
  a stable human-readable name (e.g. `"lead:rahul-sharma"`). Same input,
  same id, every run — so `upsert({ where: { id: seedId(...) }, ... })`
  is a safe no-op on re-runs.

## What gets seeded, and why

Steps run in this order (`index.ts`), each explained on the console as it
runs:

| # | Step | What | Why |
|---|------|------|-----|
| 1 | `01-organization.ts` | 1 Organization, 2 Regions, 3 Branches, 5 Departments, 4 Teams | Requirement #2. The single canonical company scope (`platform-contracts.md` §5) everything else's `organizationId` points at. |
| 2 | `02-rbac.ts` | 4 Roles, ~70 Permissions, Role→Permission grants | Requirement #3. Canonical Caller/Team Leader/Manager/Admin hierarchy from ADR 0002, with Data Scopes (Self/Team/Branch/Organization/System) per `platform-contracts.md` §2. See `lib/rbac-catalog.ts` for the full catalog and the `minRole`/`systemOnly` grant-computation rules. |
| 3 | `03-admin-user.ts` | 1 User (`admin@mudraxcapital.com`), granted the Admin Role | Requirement #4. The single bootstrap account. |
| 4 | `04-lead-catalogs.ts` | Lead Source, Lead Stage, Lost Reason, Call Feedback Status, Tag, 2 Custom Field Definitions | Requirement #1. Every one of these is documented in `prisma/models/leads.prisma` as an admin-configurable catalog, never a hardcoded enum. |
| 5 | `05-loan-catalogs.ts` | Loan Product Type, Application Status, Loan Status, EMI Pay Status | Requirement #1. The loan-lifecycle status vocabulary, spanning `loan_products`, `loan_applications`, and `loan_accounts` — three catalogs the schema keeps "permanently distinct" by design. |
| 6 | `06-banks.ts` | 3 Banks, 3 Bank Branches, 3 Commission Policy Versions | Requirement #1 / lending-partner master data `loan_applications`/`loan_accounts` reference by id. |
| 7 | `07-loan-products.ts` | 6 Loan Products | Requirement #5. Concrete products (HDFC/ICICI/SBI × Personal/Home/Car/LAP/Business) so demo Loan Applications have something real to reference. |
| 8 | `08-document-catalogs.ts` | 6 Document Categories, 15 Document Types | Requirement #1. The closed KYC/Income/Collateral/Loan-Execution/Compliance/Other catalog. |
| 9 | `09-customers.ts` | 8 Customers, 24 Customer Identifiers | Requirement #5. Demo identities anchored on a masked/hashed PAN (never the raw value) plus Phone/Email, per `customers.md`'s identity model. |
| 10 | `10-leads.ts` | 8 Leads (one per Customer), Lead Assignments, some Call Feedback/Notes/Tags | Requirement #5. Spread across every Lead Stage, Fresh through both terminal Closed outcomes. |
| 11 | `11-follow-ups.ts` | 4 Follow-ups/Call Later tasks | Requirement #5. Three Scheduled, one Completed. |
| 12 | `12-loan-applications.ts` | 4 Loan Applications | Requirement #5. Draft → Submitted → Under Bank Review → Approved, tracing Customer → Lead → Loan Product. |

### Deliberately out of scope for this pass

Telephony, Campaigns, Disbursements/Commissions, Loan Accounts/EMI
schedules, Notifications, Reports/Dashboards, and every `ai_*` module are
**not** seeded. Each is a large, independent operational module in its own
right; seeding them realistically (call recordings, dialer campaigns,
EMI amortization, AI audit trails, ...) is a separate, explicitly-scoped
task, not an extension of "seed the catalogs and a demo pipeline."

## Bootstrap Administrator credentials (DEV-ONLY)

```
Email:    aarush.taluja1@gmail.com
Password: Sairam@123

Roster: 1 Admin, 1 Manager, 3 Team Leads, 9 Callers (3 per Team Lead).
Non-admin demo password: Mudrax@User2026!
```

This password is hashed with `lib/security.ts`'s `hashSeedPassword`, which
uses the same bcrypt strategy `src/modules/auth`
(`BcryptPasswordHasher`) verifies against — so this account can actually
sign in once the app is running (see `docs/adr/0002-users-and-enterprise-rbac.md`
and `src/modules/auth/README.md`). It remains a **DEV-ONLY, publicly
documented, fixed credential**:

1. Never run this seed script against a non-local/shared environment.
2. Treat this password as compromised by definition (it is committed to
   git) and rotate it immediately in any environment where it matters.

## Files

```
prisma/seed/
├── index.ts                  # Orchestrator — run order lives here
├── lib/
│   ├── client.ts              # Standalone PrismaClient for the seed CLI only
│   ├── determinism.ts         # seedId() — deterministic UUIDv5 for idempotent demo rows
│   ├── logger.ts              # section()/explain()/summary() console output helpers
│   ├── rbac-catalog.ts         # Role/Permission catalog + grant computation (step 2's data)
│   └── security.ts            # DEV-ONLY password hash + PAN/phone hashing & masking helpers
└── steps/
    ├── 01-organization.ts
    ├── 02-rbac.ts
    ├── 03-admin-user.ts
    ├── 04-lead-catalogs.ts
    ├── 05-loan-catalogs.ts
    ├── 06-banks.ts
    ├── 07-loan-products.ts
    ├── 08-document-catalogs.ts
    ├── 09-customers.ts
    ├── 10-leads.ts
    ├── 11-follow-ups.ts
    └── 12-loan-applications.ts
```
