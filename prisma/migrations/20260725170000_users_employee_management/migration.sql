-- ============================================================================
-- Migration — Employee Management (single-company Users module)
-- ============================================================================
-- 1. Fix user_audit_log hash-chain: use built-in sha256() (not digest()/pgcrypto)
-- 2. Drop organizationId from users.users and users.user_audit_log
-- 3. Rename employeeCode → employeeId (global unique, auto MCS####)
-- 4. Add createdByUserId / updatedByUserId
-- 5. Re-key existing demo employees to MCS0001…
-- ============================================================================

-- Fix trigger (Code 42883: digest() does not exist without pgcrypto)
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
    coalesce(NEW."occurredAt"::text, ''),
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

  NEW."recordHash" := encode(sha256(convert_to(payload, 'UTF8')), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop organizationId from audit log (single-company — no tenant column)
DROP INDEX IF EXISTS "users"."user_audit_log_organizationId_idx";
ALTER TABLE "users"."user_audit_log" DROP COLUMN IF EXISTS "organizationId";

-- Rename employeeCode → employeeId
ALTER TABLE "users"."users" RENAME COLUMN "employeeCode" TO "employeeId";

-- Drop org-scoped unique / index, make employeeId globally unique
ALTER TABLE "users"."users" DROP CONSTRAINT IF EXISTS "users_organizationId_employeeCode_key";
DROP INDEX IF EXISTS "users"."users_organizationId_idx";
ALTER TABLE "users"."users" DROP COLUMN IF EXISTS "organizationId";

CREATE UNIQUE INDEX IF NOT EXISTS "users_employeeId_key" ON "users"."users"("employeeId");

-- Attribution columns
ALTER TABLE "users"."users"
  ADD COLUMN IF NOT EXISTS "createdByUserId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByUserId" UUID;

CREATE INDEX IF NOT EXISTS "users_createdByUserId_idx" ON "users"."users"("createdByUserId");
CREATE INDEX IF NOT EXISTS "users_updatedByUserId_idx" ON "users"."users"("updatedByUserId");

-- Re-key known seed employees to MCS#### (idempotent by email)
UPDATE "users"."users" SET "employeeId" = 'MCS0001' WHERE "email" = 'admin@mudraxcapital.com';
UPDATE "users"."users" SET "employeeId" = 'MCS0002' WHERE "email" = 'manager@mudraxcapital.com';
UPDATE "users"."users" SET "employeeId" = 'MCS0003' WHERE "email" = 'teamlead@mudraxcapital.com';
UPDATE "users"."users" SET "employeeId" = 'MCS0004' WHERE "email" = 'caller@mudraxcapital.com';

-- Any remaining non-MCS codes get sequential MCS IDs after the max used
DO $$
DECLARE
  max_n int;
  r RECORD;
  next_n int;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN "employeeId" ~ '^MCS[0-9]+$'
      THEN CAST(substring("employeeId" from 4) AS int)
      ELSE 0
    END
  ), 0) INTO max_n
  FROM "users"."users";

  next_n := max_n;
  FOR r IN
    SELECT id FROM "users"."users"
    WHERE "employeeId" !~ '^MCS[0-9]+$'
    ORDER BY "createdAt" ASC
  LOOP
    next_n := next_n + 1;
    UPDATE "users"."users"
    SET "employeeId" = 'MCS' || lpad(next_n::text, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;
