-- ============================================================================
-- Migration — Prisma-generated: telephony additive changes for Call Logs /
-- Call History / Click-to-Call / Call Outcomes / Call Notes / Recording
-- Metadata / Telephony Dashboard.
-- ============================================================================
-- Adds:
--   - telephony.call_outcomes  — admin-configurable Call Outcome catalog
--   - telephony.call_notes     — Call Notes linked to a Call Attempt
--   - telephony.telephony_audit_log — this module's own Audit Record table
--     (same canonical shape as leads.lead_audit_log / customers.customer_audit_log)
--   - telephony.call_attempts."agentUserId"/"callOutcomeId" — additive columns
--   - telephony.call_recordings."providerMetadata" — additive column
-- Purely additive (EXPAND), no existing telephony table/column is touched.
--
-- NOTE: this file is a hand-trimmed version of what `prisma migrate dev
-- --create-only` generated, following the exact same discipline documented in
-- migration 20260724195958_add_crm_audit_logs: the raw generator output also
-- included DDL attempting to "correct" the four partitioned audit/log tables
-- (ai_core.ai_audit_log, documents.audit_trail, notifications.communication_log,
-- reports.analytics_snapshots) back to a single-column primary key, plus
-- dropping several cross-schema foreign keys that were added by hand because
-- Prisma cannot express them (see prisma/migrations/README.md). Both are
-- diff-engine artifacts of this schema's intentional, already-documented drift
-- between the Prisma model layer and hand-written manual SQL, and are
-- intentionally removed here.
-- ============================================================================

-- CreateEnum
CREATE TYPE "telephony"."telephony_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

-- AlterTable
ALTER TABLE "telephony"."call_attempts" ADD COLUMN     "agentUserId" UUID,
ADD COLUMN     "callOutcomeId" UUID;

-- AlterTable
ALTER TABLE "telephony"."call_recordings" ADD COLUMN     "providerMetadata" JSONB;

-- CreateTable
CREATE TABLE "telephony"."call_outcomes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_notes" (
    "id" UUID NOT NULL,
    "callAttemptId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."telephony_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "telephony"."telephony_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "telephony_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_outcomes_organizationId_idx" ON "telephony"."call_outcomes"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "call_outcomes_organizationId_name_key" ON "telephony"."call_outcomes"("organizationId", "name");

-- CreateIndex
CREATE INDEX "call_notes_callAttemptId_idx" ON "telephony"."call_notes"("callAttemptId");

-- CreateIndex
CREATE INDEX "telephony_audit_log_organizationId_idx" ON "telephony"."telephony_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "telephony_audit_log_targetType_targetId_idx" ON "telephony"."telephony_audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "telephony_audit_log_occurredAt_idx" ON "telephony"."telephony_audit_log"("occurredAt");

-- CreateIndex
CREATE INDEX "call_attempts_agentUserId_idx" ON "telephony"."call_attempts"("agentUserId");

-- CreateIndex
CREATE INDEX "call_attempts_callOutcomeId_idx" ON "telephony"."call_attempts"("callOutcomeId");

-- AddForeignKey
ALTER TABLE "telephony"."call_attempts" ADD CONSTRAINT "call_attempts_callOutcomeId_fkey" FOREIGN KEY ("callOutcomeId") REFERENCES "telephony"."call_outcomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_notes" ADD CONSTRAINT "call_notes_callAttemptId_fkey" FOREIGN KEY ("callAttemptId") REFERENCES "telephony"."call_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
