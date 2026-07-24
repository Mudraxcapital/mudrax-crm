-- ============================================================================
-- Migration 0013 — Prisma-generated: add organization.organization_audit_log
-- ============================================================================
-- Adds the Organization module's own Audit Record table, the same canonical
-- shape platform-contracts.md §4 already requires of `documents.AuditTrail`,
-- `notifications.CommunicationLog`, and `ai_core.AiAuditLog` — purely
-- additive (EXPAND), no existing table/column is touched.
--
-- NOTE: this file is a hand-trimmed version of what `prisma migrate dev
-- --create-only` generated. The raw generator output also included DDL
-- attempting to "correct" four unrelated tables (ai_core.ai_audit_log,
-- documents.audit_trail, notifications.communication_log,
-- reports.analytics_snapshots) back to a single-column primary key, plus
-- dropping several cross-schema foreign keys — both are diff-engine
-- artifacts of this schema's intentional, already-documented drift between
-- the Prisma model layer and hand-written manual SQL (see
-- prisma/migrations/README.md: those four tables were manually converted to
-- partitioned tables with a composite `(id, occurredAt|periodStart)` primary
-- key, and their cross-schema FKs were added manually because Prisma cannot
-- express them). Applying that drift-correction DDL would break the
-- partitioned tables' PARTITION BY requirement and silently drop
-- already-accepted foreign keys, so it is intentionally removed here —
-- exactly the "manual migration" discipline this repository already uses
-- for every other Prisma-cannot-express-this case.
-- ============================================================================

-- CreateEnum
CREATE TYPE "organization"."organization_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

-- CreateTable
CREATE TABLE "organization"."organization_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "organization"."organization_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "organization_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_audit_log_organizationId_idx" ON "organization"."organization_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "organization_audit_log_targetType_targetId_idx" ON "organization"."organization_audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "organization_audit_log_occurredAt_idx" ON "organization"."organization_audit_log"("occurredAt");
