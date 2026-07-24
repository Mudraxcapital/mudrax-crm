# `prisma/migrations` — initial PostgreSQL migration layer

This directory is the single source of truth for the database schema, applied
in ascending folder-name (timestamp) order via `prisma migrate deploy`
(production/CI) or `prisma migrate dev` (local). **Never hand-edit a
migration that has already been committed/applied** — once a migration has
run anywhere (including a teammate's machine or CI), treat it as immutable
and ship the fix as a new, later migration instead. This rule is what makes
`prisma migrate deploy` safe to run unattended in every environment.

Two kinds of migration live side by side here, and that is intentional:

- **Prisma-generated** (`20260724000000_init`) — produced mechanically from
  `prisma/schema.prisma` + `prisma/models/*.prisma` by Prisma's schema-diff
  engine. Regenerate migrations like this one exclusively by changing the
  Prisma schema and running `prisma migrate dev` — never by hand-editing the
  SQL.
- **Manual** (every `*_manual_*` folder) — hand-written SQL for PostgreSQL
  features Prisma's schema language cannot express at all (cross-schema FKs,
  partial unique indexes, exclusion constraints, CHECK constraints, deferred
  constraints, trigger-based validation, append-only protections, hash-chain
  triggers, partitioned tables). Every one of these is anchored to an
  explicit `MANUAL SQL FOLLOW-UP` comment already present next to the
  relevant field/model in `prisma/models/*.prisma` (or, for migration 0012,
  documents the absence of one) — nothing here introduces a rule that wasn't
  already called out by name in the accepted schema.

## Run order and rationale

Migrations are grouped into four phases, following the
**expand → migrate → contract** pattern: additive changes first (schema
objects nothing yet depends on), then rules layered on top of data that may
already exist, then any narrowing/restriction last, once everything it could
break is already in place. For this *initial* layer against an empty
database the distinction mostly reads as "logical dependency order" rather
than "zero-downtime rollout choreography" — see [Evolving this further](#evolving-this-further)
for how the same phases apply differently once real data exists.

| # | Migration | Phase | Depends on | What it does |
|---|---|---|---|---|
| 1 | `20260724000000_init` | EXPAND (0) | — | Every Postgres schema, enum, table, column, default, PK, standard (single-schema) index and FK that Prisma can express directly. |
| 2 | `20260724000100_manual_extensions_and_roles` | EXPAND (1) | 1 | `btree_gist` extension; `application_role` (the non-owner runtime role); baseline grants + `ALTER DEFAULT PRIVILEGES` on all 22 module schemas. |
| 3 | `20260724000200_manual_cross_schema_foreign_keys` | EXPAND (2) | 1 | Every cross-schema FK an explicit schema comment calls for by name. |
| 4 | `20260724000300_manual_partition_audit_and_log_tables` | EXPAND (2) | 1 | Converts the four flagged append-only log/snapshot tables to `PARTITION BY RANGE`; adds the `public.ensure_monthly_partition()` helper and seeds an initial ±window of partitions. |
| 5 | `20260724000400_manual_hash_chain_triggers` | EXPAND (2) | 4 | `BEFORE INSERT` SHA-256 hash-chain triggers on the three tables carrying `recordHash`/`previousRecordHash`. Runs after partitioning so each trigger is created once, directly on the table's final shape. |
| 6 | `20260724000500_manual_append_only_protections` | **CONTRACT** (3) | 2, 4 | `REVOKE UPDATE, DELETE ... FROM application_role` on the four structurally append-only tables. The one narrowing step in this layer — deliberately last among the "infrastructure" migrations, once every table this affects already has its final shape and triggers. |
| 7 | `20260724000600_manual_check_constraints` | MIGRATE (4) | 1 | Every CHECK constraint an explicit schema comment calls for by name. |
| 8 | `20260724000700_manual_partial_unique_indexes` | MIGRATE (4) | 1 | Every partial (`WHERE`-qualified) unique index an explicit schema comment calls for by name. |
| 9 | `20260724000800_manual_exclusion_constraints` | MIGRATE (4) | 1, 2 | The one `EXCLUDE USING gist` constraint in this schema (`telephony.queue_memberships`), needs `btree_gist` from migration 2. |
| 10 | `20260724000900_manual_deferred_constraints` | MIGRATE (4) | 1 | `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` for the two documented cross-row, end-of-transaction invariants (disbursements tranche/account linkage; AI experiment variant allocation sum). |
| 11 | `20260724001000_manual_trigger_validation` | MIGRATE (4) | 1 | The one documented plain (non-deferred) `BEFORE` trigger: a Lead may not enter a Closed-Lost stage without a Lost Reason. |
| 12 | `20260724001200_manual_generated_columns_audit` | — (no DDL) | — | Documents the audit of every model/doc file for a "generated column" requirement (none found) and why the one plausible candidate was rejected. Kept in sequence so the ten requested categories are all traceable to a migration, not silently dropped. |
| 13 | `20260724184312_add_organization_audit_log` | EXPAND | 1 | Prisma-generated (hand-trimmed): adds `organization.organization_audit_log` + `organization_actor_type` enum for the Organization aggregate's Audit Log (platform-contracts.md §4's canonical shape). The raw generator output also included drift-"correction" DDL for four unrelated already-partitioned tables (see the migration's own header comment); that part was removed before applying. |
| 14 | `20260724184500_manual_organization_audit_log_protections` | EXPAND/CONTRACT | 13 | Hash-chain `BEFORE INSERT` trigger + `REVOKE UPDATE, DELETE` for `organization.organization_audit_log`, mirroring migrations 0005/0006's treatment of the other three Audit Record tables. |
| 15 | `20260724195958_add_crm_audit_logs` | EXPAND | 1 | Prisma-generated (hand-trimmed): adds `customers.customer_audit_log` / `leads.lead_audit_log` / `follow_ups.follow_up_audit_log` / `campaigns.campaign_audit_log` + their `*_actor_type` enums. |
| 16 | `20260724195959_manual_crm_audit_log_protections` | EXPAND/CONTRACT | 15 | Hash-chain `BEFORE INSERT` trigger + `REVOKE UPDATE, DELETE` for the four CRM Audit Log tables added in migration 15. |
| 17 | `20260724212350_add_telephony_core` | EXPAND | 1 | Prisma-generated (hand-trimmed): adds `telephony.call_outcomes` (admin-configurable Call Outcome catalog) and `telephony.call_notes`, plus the `telephony.telephony_audit_log` Audit Log table + `telephony_actor_type` enum, plus additive `call_attempts."agentUserId"`/`"callOutcomeId"` and `call_recordings."providerMetadata"` columns — the Telephony bounded context's Call Logs/Call History/Click-to-Call/Call Outcomes/Call Notes/Recording Metadata scope. `telephony.call_attempts`, `agent_sessions`, `call_recordings`, etc. themselves already exist from migration 1; this migration only adds what that original schema pass did not yet cover. |
| 18 | `20260724212351_manual_telephony_audit_log_protections` | EXPAND/CONTRACT | 17 | Hash-chain `BEFORE INSERT` trigger + `REVOKE UPDATE, DELETE` for `telephony.telephony_audit_log`, mirroring migrations 14/16's treatment of the other Audit Record tables. |
| 19 | `20260725010000_add_notifications_audit_log` | EXPAND | 1 | Hand-written: adds `notifications.notification_audit_log` + `notifications_actor_type` enum for the Notifications module's configuration/intent Audit Log (platform-contracts.md §4). Communication Log remains the Notification History table. |
| 20 | `20260725010001_manual_notifications_audit_log_protections` | EXPAND/CONTRACT | 19 | Hash-chain `BEFORE INSERT` trigger + `REVOKE UPDATE, DELETE` for `notifications.notification_audit_log`, mirroring migration 18. |
| 21 | `20260725020000_add_reports_audit_log` | EXPAND | 1 | Hand-written: adds `reports.report_audit_log` + `reports_actor_type` enum for the Reports module's configuration/intent Audit Log (platform-contracts.md §4). |
| 22 | `20260725020001_manual_reports_audit_log_protections` | EXPAND/CONTRACT | 21 | Hash-chain `BEFORE INSERT` trigger + `REVOKE UPDATE, DELETE` for `reports.report_audit_log`, mirroring migration 20. |
| 23 | `20260725030000_add_loan_audit_logs` | EXPAND | 1 | Hand-written: adds Audit Record tables + actor-type enums for `banks`, `loan_products`, `loan_applications`, `loan_accounts`, and `disbursements` (platform-contracts.md §4). |
| 24 | `20260725030001_manual_loan_audit_log_protections` | EXPAND/CONTRACT | 23 | Hash-chain `BEFORE INSERT` triggers + `REVOKE UPDATE, DELETE` for the five Loan Management Audit Log tables added in migration 23. |

### A note on migrations 13–14 and future schema changes to this project

Migrations 3–10 manually diverge the *physical* shape of four tables
(`documents.audit_trail`, `notifications.communication_log`,
`ai_core.ai_audit_log`, `reports.analytics_snapshots`) and several
cross-schema foreign keys away from what the Prisma model layer alone would
generate (composite partition-key primary keys; FKs Prisma cannot express
across `@@schema`s). Because of this, **`prisma migrate dev` run without
`--create-only`, or any invocation that lets Prisma's diff engine write SQL,
will regenerate DDL that tries to "correct" those four tables' primary keys
back to a single column** — which fails outright against a `PARTITION BY`
table (Postgres requires the full partition key in every unique
constraint) — and will also try to drop the manually-added cross-schema
FKs. This is expected, not a bug: it is the permanent cost of intentionally
diverging physical schema from the declared Prisma model for those specific
tables. **Every future migration must be created with `--create-only`,
reviewed, and hand-trimmed to keep only the intended change** (exactly as
migration 13 was), or written by hand entirely and applied via
`prisma db execute` + `prisma migrate resolve --applied <name>` (as
migration 14 was) — never applied via a plain, un-reviewed `prisma migrate
dev`.

Migrations 7–11 (CHECK constraints, partial unique indexes, exclusion
constraints, deferred constraints, trigger validation) have no dependencies
*on each other* — they only need migration 1 (and, for #9, the extension
from #2) — so their relative order among themselves is not load-bearing.
They are numbered in increasing order of mechanism complexity (static
same-row CHECKs → column-set partial/exclusion indexes → cross-row
deferred/trigger logic) purely for readability when reading the directory
top to bottom.

## Operational prerequisites (not schema changes — run once per environment)

1. **Grant `application_role` to the real login role.** Migration 2 creates
   `application_role` as a `NOLOGIN` group role and grants it broad
   CRUD privileges; it is never granted *to* anything automatically because
   the actual login role name is environment-specific (e.g. `mudrax` from
   `docker-compose.yml`/`.env.example` locally, a different dedicated role in
   staging/production). Run, once per environment, after migration 2:

   ```sql
   GRANT application_role TO <env-specific login role>;
   ```

   Until this is run, the connecting role keeps whatever privileges it
   already has (typically full owner privileges from having run the
   migrations), and the append-only `REVOKE`s in migration 6 have no
   practical effect against it. See migration 2's and migration 6's own
   header comments.

2. **Schedule monthly partition maintenance.** Migration 4 seeds partitions
   from 3 months back through 12 months ahead of the day it runs, plus a
   catch-all `DEFAULT` partition per table so an out-of-range `INSERT` fails
   safe instead of erroring outright. This repository generates no
   backend/scheduling code (out of scope for this task) — operating this in
   production requires *something* (a `pg_cron` job, a periodic
   `src/infra/jobs` task, or a manual runbook step) to keep calling
   `public.ensure_monthly_partition(schema, table, column, month)` a
   comfortable number of months ahead, for all four partitioned tables:
   `documents.audit_trail`, `notifications.communication_log`,
   `ai_core.ai_audit_log` (all three by `occurredAt`), and
   `reports.analytics_snapshots` (by `periodStart`).

## Deferred / out-of-scope work

- **`telephony.call_attempts` partitioning.** This codebase's own comments
  flag `call_attempts` as its highest-volume table and a strong RANGE-
  partitioning candidate, but four sibling tables
  (`call_recordings`, `call_transfers`, `call_conferences`,
  `call_monitoring_sessions`) hold a plain single-column FK straight to
  `call_attempts.id`. Partitioning `call_attempts` by `initiated_at` would
  force its primary key to become composite `(id, initiated_at)`, and
  Postgres requires any table with an FK *to* a partitioned table to carry
  every column of the referenced key — i.e. all four children would need a
  new, denormalized column added to their own Prisma models purely to keep
  pointing at it. That is a Prisma schema change this task explicitly rules
  out ("do NOT redesign the Prisma schema"). Left as a deliberately deferred
  follow-up that a future ADR/PR must accept together with a decision on how
  those four FKs get re-expressed (most likely: trigger-enforced referential
  integrity, the same category of "Prisma cannot express this" work as this
  layer's other triggers).
- **Generated/computed columns.** See migration 12 — audited, none found to
  be required by the accepted schema; one candidate (`EmiInstallment.dueAmount`)
  was considered and explicitly rejected, with its full rationale recorded
  there.
- **Seed data.** Explicitly out of scope for this task pending separate
  approval.
- **Backend/frontend code.** Explicitly out of scope for this task — this
  layer is schema/DDL only.

## Evolving this further

This layer targets an **empty** database (the very first deploy), so several
migrations take shortcuts that are only safe in that specific situation and
must **not** be copied verbatim into a later migration against a live,
populated database:

- Migration 4 uses `DROP TABLE` + `CREATE TABLE ... PARTITION BY` to convert
  four tables to partitioned tables. Against a live table with data, the
  zero-downtime path is instead: create a new, empty partitioned sibling
  table, backfill data into it in batches, then swap names inside a short
  transaction (or use `pg_partman`/logical replication for very large
  tables) — never `DROP` a table with data you intend to keep.
- Migrations 7 and 9 use plain `CREATE UNIQUE INDEX` / relies on `ALTER
  TABLE ... ADD CONSTRAINT ... EXCLUDE`, both of which take a
  table-wide lock for the duration of the build. Against a live table,
  build the index with `CREATE UNIQUE INDEX CONCURRENTLY` first (no long
  lock, but cannot run inside the same transaction as the migration; needs
  its own migration with `prisma migrate diff`'s `--script` output hand-
  adjusted, or a manually-tracked migration), verify it reports valid, and
  only then `ADD CONSTRAINT ... UNIQUE USING INDEX <name>` to attach it.
- Any future CHECK constraint added to a table that already has rows should
  be added with `NOT VALID` first, then validated separately with
  `VALIDATE CONSTRAINT` (which takes a lighter lock and can run while
  reads/writes continue), rather than a plain `ADD CONSTRAINT` that
  validates the whole table under a stronger lock inline.

In short: this layer's migrations show the *end-shape* of each feature
correctly, but a handful of them (4, 7, 9, and any future CHECK against a
populated table) reach that shape using the simpler of two valid techniques,
because "the table is currently empty" is true today and won't be by the
time any of this needs to change again.
