-- ============================================================================
-- Migration — manual: notifications.notification_audit_log protections
-- ============================================================================
-- Applies the same two platform-contracts.md §4 guarantees already given to
-- telephony.telephony_audit_log (migration 20260724212351):
--
--   1. Tamper-evidence hash chain — BEFORE INSERT trigger.
--   2. Append-only enforcement — REVOKE UPDATE, DELETE.
-- ============================================================================

CREATE OR REPLACE FUNCTION "notifications".notification_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('notifications.notification_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "notifications"."notification_audit_log"
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

CREATE TRIGGER notification_audit_log_hash_chain_biu
  BEFORE INSERT ON "notifications"."notification_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "notifications".notification_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "notifications"."notification_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "notifications"."notification_audit_log" FROM PUBLIC;
