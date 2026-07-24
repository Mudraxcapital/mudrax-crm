-- ============================================================================
-- Migration — manual: customer_audit_log / lead_audit_log /
-- follow_up_audit_log / campaign_audit_log protections
-- ============================================================================
-- Applies the same two platform-contracts.md §4 guarantees already given to
-- documents.audit_trail / notifications.communication_log /
-- ai_core.ai_audit_log / organization.organization_audit_log (migrations
-- 0005/0006 and 20260724184500) to the four new CRM module Audit Log tables
-- added in migration 20260724195958:
--
--   1. Tamper-evidence hash chain — BEFORE INSERT trigger computes
--      NEW."recordHash" as the SHA-256 digest of this row's business columns
--      plus the previous row's hash, and carries the previous hash forward
--      into NEW."previousRecordHash". Identical design to
--      organization.organization_audit_log_hash_chain(): a
--      transaction-scoped advisory lock serializes concurrent inserters
--      around "what is the current chain head."
--   2. Append-only enforcement — REVOKE UPDATE, DELETE from
--      application_role (and, for defense in depth, PUBLIC), so no
--      update/delete use-case can ever mutate an existing Audit record even
--      if application code tried to.
--
-- None of these four tables are partitioned — like Organization, Customer/
-- Lead/Follow-up/Campaign aggregate change volume does not yet warrant the
-- partitioning-strategy decision the four high-volume tables flagged in
-- migration 0003/0004 required.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- customers.customer_audit_log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "customers".customer_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('customers.customer_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "customers"."customer_audit_log"
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

CREATE TRIGGER customer_audit_log_hash_chain_biu
  BEFORE INSERT ON "customers"."customer_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "customers".customer_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "customers"."customer_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "customers"."customer_audit_log" FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- leads.lead_audit_log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "leads".lead_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('leads.lead_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "leads"."lead_audit_log"
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

CREATE TRIGGER lead_audit_log_hash_chain_biu
  BEFORE INSERT ON "leads"."lead_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "leads".lead_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "leads"."lead_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "leads"."lead_audit_log" FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- follow_ups.follow_up_audit_log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "follow_ups".follow_up_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('follow_ups.follow_up_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "follow_ups"."follow_up_audit_log"
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

CREATE TRIGGER follow_up_audit_log_hash_chain_biu
  BEFORE INSERT ON "follow_ups"."follow_up_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "follow_ups".follow_up_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "follow_ups"."follow_up_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "follow_ups"."follow_up_audit_log" FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- campaigns.campaign_audit_log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "campaigns".campaign_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('campaigns.campaign_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "campaigns"."campaign_audit_log"
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

CREATE TRIGGER campaign_audit_log_hash_chain_biu
  BEFORE INSERT ON "campaigns"."campaign_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "campaigns".campaign_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "campaigns"."campaign_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "campaigns"."campaign_audit_log" FROM PUBLIC;
