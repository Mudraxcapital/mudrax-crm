-- ============================================================================
-- Migration — manual: telephony_audit_log protections
-- ============================================================================
-- Applies the same two platform-contracts.md §4 guarantees already given to
-- organization.organization_audit_log / customers.customer_audit_log /
-- leads.lead_audit_log / follow_ups.follow_up_audit_log /
-- campaigns.campaign_audit_log (migrations 20260724184500 and
-- 20260724195959) to the new telephony.telephony_audit_log table added in
-- migration 20260724212350:
--
--   1. Tamper-evidence hash chain — BEFORE INSERT trigger computes
--      NEW."recordHash" as the SHA-256 digest of this row's business columns
--      plus the previous row's hash, and carries the previous hash forward
--      into NEW."previousRecordHash".
--   2. Append-only enforcement — REVOKE UPDATE, DELETE from
--      application_role (and, for defense in depth, PUBLIC), so no
--      update/delete use-case can ever mutate an existing Audit record even
--      if application code tried to.
--
-- telephony_audit_log is not partitioned — like organization/customers/leads/
-- follow_ups/campaigns, Telephony module change volume for this reduced
-- scope (Call Attempt/Call Note/Call Outcome/Agent Session/Call Recording)
-- does not yet warrant the partitioning-strategy decision the four
-- high-volume tables in migration 0003/0004 required.
-- ============================================================================

CREATE OR REPLACE FUNCTION "telephony".telephony_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('telephony.telephony_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "telephony"."telephony_audit_log"
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

CREATE TRIGGER telephony_audit_log_hash_chain_biu
  BEFORE INSERT ON "telephony"."telephony_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "telephony".telephony_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "telephony"."telephony_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "telephony"."telephony_audit_log" FROM PUBLIC;
