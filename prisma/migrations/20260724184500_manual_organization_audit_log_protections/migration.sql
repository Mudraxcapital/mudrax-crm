-- ============================================================================
-- Migration 0014 — manual: organization.organization_audit_log protections
-- ============================================================================
-- Applies the same two platform-contracts.md §4 guarantees already given to
-- documents.audit_trail / notifications.communication_log / ai_core.ai_audit_log
-- (migrations 0005 and 0006) to the new organization.organization_audit_log
-- table added in migration 0013:
--
--   1. Tamper-evidence hash chain — BEFORE INSERT trigger computes
--      NEW."recordHash" as the SHA-256 digest of this row's business columns
--      plus the previous row's hash, and carries the previous hash forward
--      into NEW."previousRecordHash". Identical design to
--      documents.audit_trail_hash_chain() (migration 0005): a
--      transaction-scoped advisory lock serializes concurrent inserters
--      around "what is the current chain head."
--   2. Append-only enforcement — REVOKE UPDATE, DELETE from
--      application_role (and, for defense in depth, PUBLIC), so no
--      update/delete use-case can ever mutate an existing Audit record even
--      if application code tried to.
--
-- This table is not partitioned (unlike the four tables migration 0003/0004
-- flagged as unbounded/high-volume RANGE-partitioning candidates) — Organization
-- aggregate change volume is low, operator-driven configuration data, not a
-- per-transaction business event stream, so no partitioning-strategy decision
-- is warranted for it in this initial layer.
-- ============================================================================

CREATE OR REPLACE FUNCTION "organization".organization_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('organization.organization_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "organization"."organization_audit_log"
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

  NEW."recordHash" := encode(sha256(convert_to(payload, 'UTF8')), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_audit_log_hash_chain_biu
  BEFORE INSERT ON "organization"."organization_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "organization".organization_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "organization"."organization_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "organization"."organization_audit_log" FROM PUBLIC;
