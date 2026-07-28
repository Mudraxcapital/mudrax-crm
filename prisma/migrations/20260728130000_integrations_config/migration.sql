-- ============================================================================
-- Migration — hand-written: integrations schema (EXPAND)
-- ============================================================================
-- Configuration-only tables for connectors, field mappings, and webhooks.
-- Does not store leads. Does not alter users / leads / campaigns.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS "integrations";

CREATE TYPE "integrations"."connection_status" AS ENUM ('DISABLED', 'ENABLED', 'ERROR');
CREATE TYPE "integrations"."webhook_endpoint_status" AS ENUM ('ACTIVE', 'DISABLED', 'REVOKED');
CREATE TYPE "integrations"."integrations_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "integrations"."connections" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "catalogCode" VARCHAR(64) NOT NULL,
    "displayName" VARCHAR(150) NOT NULL,
    "status" "integrations"."connection_status" NOT NULL DEFAULT 'DISABLED',
    "leadCenterSource" VARCHAR(64),
    "config" JSONB,
    "credentialsRef" VARCHAR(255),
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "connections_organizationId_catalogCode_key"
  ON "integrations"."connections"("organizationId", "catalogCode");
CREATE INDEX "connections_organizationId_idx" ON "integrations"."connections"("organizationId");
CREATE INDEX "connections_status_idx" ON "integrations"."connections"("status");

CREATE TABLE "integrations"."field_mappings" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "externalField" VARCHAR(150) NOT NULL,
    "internalField" VARCHAR(100) NOT NULL,
    "transform" VARCHAR(50),
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "field_mappings_connectionId_externalField_key"
  ON "integrations"."field_mappings"("connectionId", "externalField");
CREATE INDEX "field_mappings_organizationId_idx" ON "integrations"."field_mappings"("organizationId");
CREATE INDEX "field_mappings_connectionId_idx" ON "integrations"."field_mappings"("connectionId");

CREATE TABLE "integrations"."webhook_endpoints" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "connectionId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "pathToken" VARCHAR(64) NOT NULL,
    "secretHash" VARCHAR(128) NOT NULL,
    "secretPrefix" VARCHAR(12) NOT NULL,
    "status" "integrations"."webhook_endpoint_status" NOT NULL DEFAULT 'ACTIVE',
    "leadCenterSource" VARCHAR(64),
    "lastReceivedAt" TIMESTAMP(3),
    "receiveCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" UUID,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_endpoints_pathToken_key"
  ON "integrations"."webhook_endpoints"("pathToken");
CREATE INDEX "webhook_endpoints_organizationId_idx"
  ON "integrations"."webhook_endpoints"("organizationId");
CREATE INDEX "webhook_endpoints_status_idx"
  ON "integrations"."webhook_endpoints"("status");

CREATE TABLE "integrations"."integrations_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "integrations"."integrations_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "integrations_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integrations_audit_log_organizationId_idx"
  ON "integrations"."integrations_audit_log"("organizationId");
CREATE INDEX "integrations_audit_log_targetType_targetId_idx"
  ON "integrations"."integrations_audit_log"("targetType", "targetId");
CREATE INDEX "integrations_audit_log_occurredAt_idx"
  ON "integrations"."integrations_audit_log"("occurredAt");

ALTER TABLE "integrations"."field_mappings"
  ADD CONSTRAINT "field_mappings_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "integrations"."connections"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integrations"."webhook_endpoints"
  ADD CONSTRAINT "webhook_endpoints_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "integrations"."connections"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
