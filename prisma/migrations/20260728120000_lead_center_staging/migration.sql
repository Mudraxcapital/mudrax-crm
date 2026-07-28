-- ============================================================================
-- Migration — hand-written: lead_center schema (EXPAND)
-- ============================================================================
-- Additive Lead Center staging schema. External connectors and CSV uploads
-- land here; Campaign Leads remain owned by `leads` and are created only on
-- explicit import. Does not alter existing `leads` / `campaigns` tables.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS "lead_center";

CREATE TYPE "lead_center"."ingestion_batch_status" AS ENUM ('RECEIVED', 'PROCESSING', 'STORED', 'FAILED');
CREATE TYPE "lead_center"."staged_lead_status" AS ENUM (
  'PENDING_REVIEW',
  'DUPLICATE_CHECK',
  'VALIDATION',
  'MANAGER_REVIEW',
  'READY_TO_IMPORT',
  'IMPORTED',
  'ARCHIVED',
  'DELETED'
);
CREATE TYPE "lead_center"."staged_duplicate_status" AS ENUM ('UNKNOWN', 'NONE', 'POSSIBLE', 'EXACT');
CREATE TYPE "lead_center"."staged_validation_status" AS ENUM ('PENDING', 'VALID', 'INVALID');
CREATE TYPE "lead_center"."staged_import_status" AS ENUM ('NOT_IMPORTED', 'QUEUED', 'IMPORTED', 'FAILED');
CREATE TYPE "lead_center"."lead_center_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "lead_center"."source_buckets" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "source_buckets_organizationId_code_key"
  ON "lead_center"."source_buckets"("organizationId", "code");
CREATE INDEX "source_buckets_organizationId_idx"
  ON "lead_center"."source_buckets"("organizationId");

CREATE TABLE "lead_center"."ingestion_batches" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sourceBucketId" UUID NOT NULL,
    "sourceCode" VARCHAR(64) NOT NULL,
    "receivedByUserId" UUID,
    "sourceFileName" VARCHAR(255),
    "connectorRef" VARCHAR(150),
    "status" "lead_center"."ingestion_batch_status" NOT NULL DEFAULT 'RECEIVED',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "storedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "ownerManagerId" UUID,
    "ownerTeamLeadId" UUID,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ingestion_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ingestion_batches_organizationId_idx" ON "lead_center"."ingestion_batches"("organizationId");
CREATE INDEX "ingestion_batches_sourceCode_idx" ON "lead_center"."ingestion_batches"("sourceCode");
CREATE INDEX "ingestion_batches_status_idx" ON "lead_center"."ingestion_batches"("status");
CREATE INDEX "ingestion_batches_ownerManagerId_idx" ON "lead_center"."ingestion_batches"("ownerManagerId");

CREATE TABLE "lead_center"."staged_leads" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "ingestionBatchId" UUID,
    "sourceBucketId" UUID NOT NULL,
    "sourceCode" VARCHAR(64) NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(320),
    "campaignNameHint" VARCHAR(200),
    "rawPayload" JSONB NOT NULL,
    "normalizedPayload" JSONB,
    "status" "lead_center"."staged_lead_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "duplicateStatus" "lead_center"."staged_duplicate_status" NOT NULL DEFAULT 'UNKNOWN',
    "validationStatus" "lead_center"."staged_validation_status" NOT NULL DEFAULT 'PENDING',
    "importStatus" "lead_center"."staged_import_status" NOT NULL DEFAULT 'NOT_IMPORTED',
    "matchReason" VARCHAR(200),
    "matchedLeadId" UUID,
    "matchedCustomerId" UUID,
    "validationErrors" JSONB,
    "tags" JSONB,
    "branchId" UUID,
    "assignedManagerUserId" UUID,
    "ownerManagerId" UUID,
    "ownerTeamLeadId" UUID,
    "importedLeadId" UUID,
    "importedCampaignId" UUID,
    "importedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staged_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staged_leads_organizationId_idx" ON "lead_center"."staged_leads"("organizationId");
CREATE INDEX "staged_leads_sourceCode_idx" ON "lead_center"."staged_leads"("sourceCode");
CREATE INDEX "staged_leads_status_idx" ON "lead_center"."staged_leads"("status");
CREATE INDEX "staged_leads_duplicateStatus_idx" ON "lead_center"."staged_leads"("duplicateStatus");
CREATE INDEX "staged_leads_validationStatus_idx" ON "lead_center"."staged_leads"("validationStatus");
CREATE INDEX "staged_leads_importStatus_idx" ON "lead_center"."staged_leads"("importStatus");
CREATE INDEX "staged_leads_ownerManagerId_idx" ON "lead_center"."staged_leads"("ownerManagerId");
CREATE INDEX "staged_leads_ownerTeamLeadId_idx" ON "lead_center"."staged_leads"("ownerTeamLeadId");
CREATE INDEX "staged_leads_organizationId_sourceCode_createdAt_idx"
  ON "lead_center"."staged_leads"("organizationId", "sourceCode", "createdAt");
CREATE INDEX "staged_leads_organizationId_status_idx"
  ON "lead_center"."staged_leads"("organizationId", "status");

CREATE TABLE "lead_center"."lead_center_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "lead_center"."lead_center_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "lead_center_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_center_audit_log_organizationId_idx"
  ON "lead_center"."lead_center_audit_log"("organizationId");
CREATE INDEX "lead_center_audit_log_targetType_targetId_idx"
  ON "lead_center"."lead_center_audit_log"("targetType", "targetId");
CREATE INDEX "lead_center_audit_log_occurredAt_idx"
  ON "lead_center"."lead_center_audit_log"("occurredAt");

ALTER TABLE "lead_center"."ingestion_batches"
  ADD CONSTRAINT "ingestion_batches_sourceBucketId_fkey"
  FOREIGN KEY ("sourceBucketId") REFERENCES "lead_center"."source_buckets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lead_center"."staged_leads"
  ADD CONSTRAINT "staged_leads_ingestionBatchId_fkey"
  FOREIGN KEY ("ingestionBatchId") REFERENCES "lead_center"."ingestion_batches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lead_center"."staged_leads"
  ADD CONSTRAINT "staged_leads_sourceBucketId_fkey"
  FOREIGN KEY ("sourceBucketId") REFERENCES "lead_center"."source_buckets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
