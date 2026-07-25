-- ============================================================================
-- Migration — User Management + single-company prep
-- ============================================================================
-- 1. Rename UserStatus OFFBOARDED → INACTIVE
-- 2. Add profile photo + reporting hierarchy columns on users.users
-- 3. Add users.user_audit_log (+ actor enum) with hash-chain trigger
-- 4. Rename Role "Team Leader" → "Team Lead" (fixed four-role set)
-- ============================================================================

-- Rename enum value (PostgreSQL 10+)
ALTER TYPE "users"."user_status" RENAME VALUE 'OFFBOARDED' TO 'INACTIVE';

-- User Management columns
ALTER TABLE "users"."users"
  ADD COLUMN IF NOT EXISTS "profilePhotoUrl" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "assignedTeamLeadId" UUID,
  ADD COLUMN IF NOT EXISTS "reportingManagerId" UUID;

CREATE INDEX IF NOT EXISTS "users_assignedTeamLeadId_idx"
  ON "users"."users"("assignedTeamLeadId");
CREATE INDEX IF NOT EXISTS "users_reportingManagerId_idx"
  ON "users"."users"("reportingManagerId");
CREATE INDEX IF NOT EXISTS "users_status_idx"
  ON "users"."users"("status");

-- Fixed role rename (idempotent)
UPDATE "rbac"."roles"
SET "name" = 'Team Lead',
    "description" = 'Supervises Callers assigned to them. Data Scope: Team.'
WHERE "name" = 'Team Leader';

-- Audit log
CREATE TYPE "users"."user_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

CREATE TABLE "users"."user_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "users"."user_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "user_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_audit_log_organizationId_idx"
  ON "users"."user_audit_log"("organizationId");
CREATE INDEX "user_audit_log_targetType_targetId_idx"
  ON "users"."user_audit_log"("targetType", "targetId");
CREATE INDEX "user_audit_log_occurredAt_idx"
  ON "users"."user_audit_log"("occurredAt");

-- Hash-chain trigger (same pattern as customers.customer_audit_log)
CREATE OR REPLACE FUNCTION "users".user_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('users.user_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "users"."user_audit_log"
  ORDER BY "occurredAt" DESC, "id" DESC
  LIMIT 1;

  NEW."previousRecordHash" := prev_hash;

  payload := concat_ws('|',
    NEW."id"::text,
    NEW."organizationId"::text,
    NEW."occurredAt"::text,
    NEW."actorType"::text,
    coalesce(NEW."actorId"::text, ''),
    NEW."action",
    NEW."targetType",
    NEW."targetId"::text,
    coalesce(NEW."correlationId"::text, ''),
    coalesce(NEW."beforeState"::text, ''),
    coalesce(NEW."afterState"::text, ''),
    coalesce(prev_hash, '')
  );

  -- Use built-in sha256() (Postgres 14+) — do NOT depend on pgcrypto digest().
  NEW."recordHash" := encode(sha256(convert_to(payload, 'UTF8')), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_audit_log_hash_chain_trg ON "users"."user_audit_log";
CREATE TRIGGER user_audit_log_hash_chain_trg
  BEFORE INSERT ON "users"."user_audit_log"
  FOR EACH ROW
  EXECUTE FUNCTION "users".user_audit_log_hash_chain();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'application_role') THEN
    REVOKE UPDATE, DELETE ON "users"."user_audit_log" FROM application_role;
  END IF;
  REVOKE UPDATE, DELETE ON "users"."user_audit_log" FROM PUBLIC;
END $$;