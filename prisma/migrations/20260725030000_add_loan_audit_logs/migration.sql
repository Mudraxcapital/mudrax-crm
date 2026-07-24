-- ============================================================================
-- Migration — hand-written: loan management module audit logs
-- ============================================================================
-- Adds Audit Record tables for banks / loan_products / loan_applications /
-- loan_accounts / disbursements (platform-contracts.md §4 canonical shape),
-- mirroring reports.report_audit_log. Purely additive (EXPAND).
--
-- Hand-written rather than `prisma migrate dev` so the diff engine cannot
-- attempt to "correct" the four partitioned audit/log tables
-- (see prisma/migrations/README.md).
-- ============================================================================

-- banks --------------------------------------------------------------------
CREATE TYPE "banks"."banks_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "banks"."bank_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "banks"."banks_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "bank_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_audit_log_organizationId_idx" ON "banks"."bank_audit_log"("organizationId");
CREATE INDEX "bank_audit_log_targetType_targetId_idx" ON "banks"."bank_audit_log"("targetType", "targetId");
CREATE INDEX "bank_audit_log_occurredAt_idx" ON "banks"."bank_audit_log"("occurredAt");

-- loan_products ------------------------------------------------------------
CREATE TYPE "loan_products"."loan_products_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "loan_products"."loan_product_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "loan_products"."loan_products_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "loan_product_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loan_product_audit_log_organizationId_idx" ON "loan_products"."loan_product_audit_log"("organizationId");
CREATE INDEX "loan_product_audit_log_targetType_targetId_idx" ON "loan_products"."loan_product_audit_log"("targetType", "targetId");
CREATE INDEX "loan_product_audit_log_occurredAt_idx" ON "loan_products"."loan_product_audit_log"("occurredAt");

-- loan_applications --------------------------------------------------------
CREATE TYPE "loan_applications"."loan_applications_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "loan_applications"."loan_application_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "loan_applications"."loan_applications_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "loan_application_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loan_application_audit_log_organizationId_idx" ON "loan_applications"."loan_application_audit_log"("organizationId");
CREATE INDEX "loan_application_audit_log_targetType_targetId_idx" ON "loan_applications"."loan_application_audit_log"("targetType", "targetId");
CREATE INDEX "loan_application_audit_log_occurredAt_idx" ON "loan_applications"."loan_application_audit_log"("occurredAt");

-- loan_accounts ------------------------------------------------------------
CREATE TYPE "loan_accounts"."loan_accounts_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "loan_accounts"."loan_account_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "loan_accounts"."loan_accounts_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "loan_account_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loan_account_audit_log_organizationId_idx" ON "loan_accounts"."loan_account_audit_log"("organizationId");
CREATE INDEX "loan_account_audit_log_targetType_targetId_idx" ON "loan_accounts"."loan_account_audit_log"("targetType", "targetId");
CREATE INDEX "loan_account_audit_log_occurredAt_idx" ON "loan_accounts"."loan_account_audit_log"("occurredAt");

-- disbursements ------------------------------------------------------------
CREATE TYPE "disbursements"."disbursements_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "disbursements"."disbursement_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "disbursements"."disbursements_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "disbursement_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "disbursement_audit_log_organizationId_idx" ON "disbursements"."disbursement_audit_log"("organizationId");
CREATE INDEX "disbursement_audit_log_targetType_targetId_idx" ON "disbursements"."disbursement_audit_log"("targetType", "targetId");
CREATE INDEX "disbursement_audit_log_occurredAt_idx" ON "disbursements"."disbursement_audit_log"("occurredAt");
