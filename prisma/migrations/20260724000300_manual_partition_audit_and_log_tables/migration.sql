-- ============================================================================
-- Migration 0004 — manual: partition the append-only log/snapshot tables
-- (EXPAND, phase 2 — must run before hash-chain triggers / append-only
-- REVOKEs, both of which are (re)created directly on the tables' final,
-- already-partitioned shape by migrations 0008/0009, so nothing has to be
-- re-applied twice)
-- ============================================================================
-- Converts the four tables whose own schema comments explicitly flag them
-- as RANGE-partitioning candidates, and which have zero inbound foreign
-- keys from any other table (safe to restructure without touching any
-- dependent schema):
--
--   * documents.audit_trail            (comment: "strong candidate for
--     RANGE partitioning by `occurred_at`")
--   * notifications.communication_log  (comment: "Strong RANGE-
--     partitioning-by-`occurred_at` candidate at enterprise send volume")
--   * reports.analytics_snapshots      (comment: "consider RANGE
--     partitioning by `period_start`")
--   * ai_core.ai_audit_log             (same canonical append-only shape as
--     documents.audit_trail and notifications.communication_log per
--     platform-contracts.md §4 "one canonical shape" — partitioned here for
--     the same reason even though its own comment only calls out the
--     REVOKE half of migration 0009)
--
-- This runs while every one of these tables is still empty (this is the
-- INITIAL migration layer — no seed data exists yet per this task's scope),
-- so the safe, minimal-risk approach is DROP + CREATE ... PARTITION BY,
-- rather than the CONCURRENTLY-safe, zero-downtime "create sibling
-- partitioned table, backfill, swap" dance a *later* migration against a
-- live, populated table would need to use instead (see the "Evolving this
-- further" note in prisma/migrations/README.md).
--
-- Postgres constraint that shapes every table below: a PRIMARY KEY (or any
-- UNIQUE/EXCLUDE constraint) on a partitioned table must include every
-- partition-key column. Each table's physical primary key therefore
-- becomes a composite `(id, <partition column>)` instead of `(id)` alone.
-- This is a physical-layer-only change — the Prisma model still declares
-- `id` as `@id`, application code still does `WHERE id = $1` for point
-- lookups (backed by the plain, non-unique index on `id` alone created
-- below on the partitioned parent, which Postgres automatically
-- materializes on every partition), and global uniqueness of `id` is still
-- guaranteed operationally by UUID generation — it is simply no longer
-- re-verified by a single Postgres index the way a non-partitioned table's
-- `id` PK would. This is the standard, widely-documented trade-off for
-- high-volume, time-partitioned, UUID-keyed append-only tables.
--
-- telephony.call_attempts — the other table this codebase's own comments
-- flag as "the highest-volume table in this schema and a strong candidate
-- for native PostgreSQL range partitioning by `initiated_at`" — is
-- DELIBERATELY NOT partitioned in this migration. Unlike the four tables
-- above, four sibling telephony tables hold a plain, single-column foreign
-- key straight to `call_attempts.id` (call_recordings, call_transfers,
-- call_conferences, call_monitoring_sessions). Partitioning
-- `call_attempts` by `initiated_at` would force its primary key to become
-- composite `(id, initiated_at)`, and Postgres requires any table with a
-- foreign key TO a partitioned table to carry every column of the
-- referenced key — i.e. all four child tables would need a new,
-- denormalized `call_attempt_initiated_at`-shaped column added to their
-- own schema purely to keep pointing at it. That is a Prisma **schema**
-- change (new columns on four models), which this task explicitly
-- forbids ("Do NOT redesign the Prisma schema"). Partitioning
-- `call_attempts` is therefore left as a deliberately deferred, separate,
-- future change that a follow-up ADR/PR must accept together with a
-- decision on how those four FKs are re-expressed (most likely: converted
-- to trigger-enforced referential integrity, the same "PostgreSQL feature
-- Prisma cannot express" category as this task's other trigger-based
-- work) — see prisma/migrations/README.md, "Deferred work," for the
-- tracked follow-up.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Shared helper: idempotently ensure one calendar-month partition exists on
-- a RANGE-partitioned parent. Lives in `public` (no single business module
-- owns table-maintenance tooling that spans schemas) and is reused by every
-- partitioned table's monthly-maintenance job.
--
-- NOTE: this repo generates no backend/scheduling code (out of scope for
-- this task). Operating this in production requires *something* — a
-- `pg_cron` job, a periodic src/infra/jobs task, or a manual runbook step —
-- to call `public.ensure_monthly_partition(...)` a comfortable number of
-- months ahead of the current date for each of the four tables below,
-- and to check no partition's upper bound is ever allowed to lag behind
-- "now." Until that operational job exists, every table also gets a
-- catch-all DEFAULT partition (created below) so an out-of-range INSERT
-- fails safe into a slow-but-correct bucket instead of erroring outright.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public".ensure_monthly_partition(
  parent_schema text,
  parent_table text,
  partition_column text,
  for_month date
) RETURNS void AS $$
DECLARE
  month_start date := date_trunc('month', for_month)::date;
  month_end date := (date_trunc('month', for_month) + interval '1 month')::date;
  partition_name text := format('%s_y%sm%s', parent_table, to_char(month_start, 'YYYY'), to_char(month_start, 'MM'));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = parent_schema AND c.relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
      parent_schema, partition_name, parent_schema, parent_table, month_start, month_end
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION "public".ensure_monthly_partition(text, text, text, date) IS
  'Idempotently creates one calendar-month RANGE partition. Call once per '
  'table per upcoming month from an operational scheduler (pg_cron / '
  'src/infra/jobs); the partition_column argument is accepted for '
  'documentation/future-proofing but the FOR VALUES bounds are always '
  'derived from for_month, since every partitioned table below has exactly '
  'one partition column.';

-- ----------------------------------------------------------------------------
-- documents.audit_trail
-- ----------------------------------------------------------------------------
DROP TABLE "documents"."audit_trail";

CREATE TABLE "documents"."audit_trail" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "documents"."actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "audit_trail_pkey" PRIMARY KEY ("id", "occurredAt")
) PARTITION BY RANGE ("occurredAt");

CREATE TABLE "documents"."audit_trail_default" PARTITION OF "documents"."audit_trail" DEFAULT;

CREATE INDEX "audit_trail_id_idx" ON "documents"."audit_trail"("id");
CREATE INDEX "audit_trail_organizationId_idx" ON "documents"."audit_trail"("organizationId");
CREATE INDEX "audit_trail_targetType_targetId_idx" ON "documents"."audit_trail"("targetType", "targetId");
CREATE INDEX "audit_trail_occurredAt_idx" ON "documents"."audit_trail"("occurredAt");

-- ----------------------------------------------------------------------------
-- notifications.communication_log
-- ----------------------------------------------------------------------------
DROP TABLE "notifications"."communication_log";

CREATE TABLE "notifications"."communication_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "notificationDeliveryId" UUID,
    "eventType" VARCHAR(150) NOT NULL,
    "details" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "communication_log_pkey" PRIMARY KEY ("id", "occurredAt")
) PARTITION BY RANGE ("occurredAt");

CREATE TABLE "notifications"."communication_log_default" PARTITION OF "notifications"."communication_log" DEFAULT;

CREATE INDEX "communication_log_id_idx" ON "notifications"."communication_log"("id");
CREATE INDEX "communication_log_organizationId_idx" ON "notifications"."communication_log"("organizationId");
CREATE INDEX "communication_log_notificationId_idx" ON "notifications"."communication_log"("notificationId");
CREATE INDEX "communication_log_occurredAt_idx" ON "notifications"."communication_log"("occurredAt");

ALTER TABLE "notifications"."communication_log"
  ADD CONSTRAINT "communication_log_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "notifications"."notifications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "communication_log_notificationDeliveryId_fkey"
    FOREIGN KEY ("notificationDeliveryId") REFERENCES "notifications"."notification_deliveries"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- ai_core.ai_audit_log
-- ----------------------------------------------------------------------------
DROP TABLE "ai_core"."ai_audit_log";

CREATE TABLE "ai_core"."ai_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "ai_core"."ai_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "details" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "ai_audit_log_pkey" PRIMARY KEY ("id", "occurredAt")
) PARTITION BY RANGE ("occurredAt");

CREATE TABLE "ai_core"."ai_audit_log_default" PARTITION OF "ai_core"."ai_audit_log" DEFAULT;

CREATE INDEX "ai_audit_log_id_idx" ON "ai_core"."ai_audit_log"("id");
CREATE INDEX "ai_audit_log_organizationId_idx" ON "ai_core"."ai_audit_log"("organizationId");
CREATE INDEX "ai_audit_log_targetType_targetId_idx" ON "ai_core"."ai_audit_log"("targetType", "targetId");
CREATE INDEX "ai_audit_log_occurredAt_idx" ON "ai_core"."ai_audit_log"("occurredAt");

-- ----------------------------------------------------------------------------
-- reports.analytics_snapshots (partition column is periodStart, not
-- occurredAt/computedAt — this table's own timeline concept for reporting
-- purposes is the period the snapshot covers, per its schema comment)
-- ----------------------------------------------------------------------------
DROP TABLE "reports"."analytics_snapshots";

CREATE TABLE "reports"."analytics_snapshots" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "metricDefinitionId" UUID NOT NULL,
    "metricDefinitionVersionId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "value" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id", "periodStart")
) PARTITION BY RANGE ("periodStart");

CREATE TABLE "reports"."analytics_snapshots_default" PARTITION OF "reports"."analytics_snapshots" DEFAULT;

CREATE INDEX "analytics_snapshots_id_idx" ON "reports"."analytics_snapshots"("id");
CREATE INDEX "analytics_snapshots_organizationId_idx" ON "reports"."analytics_snapshots"("organizationId");
CREATE INDEX "analytics_snapshots_metricDefinitionId_periodStart_idx" ON "reports"."analytics_snapshots"("metricDefinitionId", "periodStart");

ALTER TABLE "reports"."analytics_snapshots"
  ADD CONSTRAINT "analytics_snapshots_metricDefinitionId_fkey"
    FOREIGN KEY ("metricDefinitionId") REFERENCES "reports"."metric_definitions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "analytics_snapshots_metricDefinitionVersionId_fkey"
    FOREIGN KEY ("metricDefinitionVersionId") REFERENCES "reports"."metric_definition_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Seed an initial partition window: 3 months back to 12 months ahead of the
-- day this migration actually runs in a given environment. Re-running the
-- loop is always safe (ensure_monthly_partition is idempotent) — this is
-- exactly the shape an operational monthly job should keep re-invoking.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  target_month date;
  offset_months int;
BEGIN
  FOR offset_months IN -3..12 LOOP
    target_month := (date_trunc('month', CURRENT_DATE) + make_interval(months => offset_months))::date;
    PERFORM "public".ensure_monthly_partition('documents', 'audit_trail', 'occurredAt', target_month);
    PERFORM "public".ensure_monthly_partition('notifications', 'communication_log', 'occurredAt', target_month);
    PERFORM "public".ensure_monthly_partition('ai_core', 'ai_audit_log', 'occurredAt', target_month);
    PERFORM "public".ensure_monthly_partition('reports', 'analytics_snapshots', 'periodStart', target_month);
  END LOOP;
END;
$$;
