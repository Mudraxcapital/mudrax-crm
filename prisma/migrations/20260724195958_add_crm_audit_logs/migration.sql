-- ============================================================================
-- Migration — Prisma-generated: add customer_audit_log / lead_audit_log /
-- follow_up_audit_log / campaign_audit_log
-- ============================================================================
-- Adds the Customers/Leads/Follow-ups/Campaigns modules' own Audit Record
-- tables, the same canonical shape platform-contracts.md §4 already requires
-- of `documents.AuditTrail`, `notifications.CommunicationLog`,
-- `ai_core.AiAuditLog`, and `organization.OrganizationAuditLog` — purely
-- additive (EXPAND), no existing table/column is touched.
--
-- NOTE: this file is a hand-trimmed version of what `prisma migrate dev
-- --create-only` generated, following the exact same discipline already
-- documented in migration 20260724184312_add_organization_audit_log: the raw
-- generator output also included DDL attempting to "correct" the four
-- partitioned audit/log tables (ai_core.ai_audit_log, documents.audit_trail,
-- notifications.communication_log, reports.analytics_snapshots) back to a
-- single-column primary key, plus dropping several cross-schema foreign keys
-- that were added by hand because Prisma cannot express them (see
-- prisma/migrations/README.md). Both are diff-engine artifacts of this
-- schema's intentional, already-documented drift between the Prisma model
-- layer and hand-written manual SQL. Applying that drift-correction DDL
-- would break the partitioned tables' PARTITION BY requirement and silently
-- drop already-accepted foreign keys, so it is intentionally removed here.
-- ============================================================================

-- CreateEnum
CREATE TYPE "campaigns"."campaign_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

-- CreateEnum
CREATE TYPE "customers"."customer_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

-- CreateEnum
CREATE TYPE "follow_ups"."follow_up_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

-- CreateEnum
CREATE TYPE "leads"."lead_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

-- CreateTable
CREATE TABLE "campaigns"."campaign_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "campaigns"."campaign_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "campaign_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers"."customer_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "customers"."customer_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "customer_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups"."follow_up_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "follow_ups"."follow_up_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "follow_up_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "leads"."lead_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "lead_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_audit_log_organizationId_idx" ON "campaigns"."campaign_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_audit_log_targetType_targetId_idx" ON "campaigns"."campaign_audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "campaign_audit_log_occurredAt_idx" ON "campaigns"."campaign_audit_log"("occurredAt");

-- CreateIndex
CREATE INDEX "customer_audit_log_organizationId_idx" ON "customers"."customer_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "customer_audit_log_targetType_targetId_idx" ON "customers"."customer_audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "customer_audit_log_occurredAt_idx" ON "customers"."customer_audit_log"("occurredAt");

-- CreateIndex
CREATE INDEX "follow_up_audit_log_organizationId_idx" ON "follow_ups"."follow_up_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "follow_up_audit_log_targetType_targetId_idx" ON "follow_ups"."follow_up_audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "follow_up_audit_log_occurredAt_idx" ON "follow_ups"."follow_up_audit_log"("occurredAt");

-- CreateIndex
CREATE INDEX "lead_audit_log_organizationId_idx" ON "leads"."lead_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "lead_audit_log_targetType_targetId_idx" ON "leads"."lead_audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "lead_audit_log_occurredAt_idx" ON "leads"."lead_audit_log"("occurredAt");
