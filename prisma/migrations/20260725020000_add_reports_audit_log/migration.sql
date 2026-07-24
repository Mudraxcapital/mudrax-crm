-- ============================================================================
-- Migration — hand-written: reports.report_audit_log
-- ============================================================================
-- Adds the Reports module's configuration/intent Audit Record table
-- (platform-contracts.md §4 canonical shape), mirroring
-- notifications.notification_audit_log. Purely additive (EXPAND).
--
-- Hand-written rather than `prisma migrate dev` so the diff engine cannot
-- attempt to "correct" the four partitioned audit/log tables
-- (see prisma/migrations/README.md).
-- ============================================================================

CREATE TYPE "reports"."reports_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "reports"."report_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "reports"."reports_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "report_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_audit_log_organizationId_idx" ON "reports"."report_audit_log"("organizationId");
CREATE INDEX "report_audit_log_targetType_targetId_idx" ON "reports"."report_audit_log"("targetType", "targetId");
CREATE INDEX "report_audit_log_occurredAt_idx" ON "reports"."report_audit_log"("occurredAt");
