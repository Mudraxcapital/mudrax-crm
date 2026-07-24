-- ============================================================================
-- Migration — manual: loan management audit log protections
-- ============================================================================
-- Applies the same two platform-contracts.md §4 guarantees already given to
-- reports.report_audit_log (migration 20260725020001):
--
--   1. Tamper-evidence hash chain — BEFORE INSERT trigger.
--   2. Append-only enforcement — REVOKE UPDATE, DELETE.
-- ============================================================================

-- banks.bank_audit_log -----------------------------------------------------
CREATE OR REPLACE FUNCTION "banks".bank_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('banks.bank_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "banks"."bank_audit_log"
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

CREATE TRIGGER bank_audit_log_hash_chain_biu
  BEFORE INSERT ON "banks"."bank_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "banks".bank_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "banks"."bank_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "banks"."bank_audit_log" FROM PUBLIC;

-- loan_products.loan_product_audit_log -------------------------------------
CREATE OR REPLACE FUNCTION "loan_products".loan_product_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('loan_products.loan_product_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "loan_products"."loan_product_audit_log"
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

CREATE TRIGGER loan_product_audit_log_hash_chain_biu
  BEFORE INSERT ON "loan_products"."loan_product_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "loan_products".loan_product_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "loan_products"."loan_product_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "loan_products"."loan_product_audit_log" FROM PUBLIC;

-- loan_applications.loan_application_audit_log -----------------------------
CREATE OR REPLACE FUNCTION "loan_applications".loan_application_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('loan_applications.loan_application_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "loan_applications"."loan_application_audit_log"
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

CREATE TRIGGER loan_application_audit_log_hash_chain_biu
  BEFORE INSERT ON "loan_applications"."loan_application_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "loan_applications".loan_application_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "loan_applications"."loan_application_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "loan_applications"."loan_application_audit_log" FROM PUBLIC;

-- loan_accounts.loan_account_audit_log -------------------------------------
CREATE OR REPLACE FUNCTION "loan_accounts".loan_account_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('loan_accounts.loan_account_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "loan_accounts"."loan_account_audit_log"
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

CREATE TRIGGER loan_account_audit_log_hash_chain_biu
  BEFORE INSERT ON "loan_accounts"."loan_account_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "loan_accounts".loan_account_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "loan_accounts"."loan_account_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "loan_accounts"."loan_account_audit_log" FROM PUBLIC;

-- disbursements.disbursement_audit_log -------------------------------------
CREATE OR REPLACE FUNCTION "disbursements".disbursement_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('disbursements.disbursement_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "disbursements"."disbursement_audit_log"
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

CREATE TRIGGER disbursement_audit_log_hash_chain_biu
  BEFORE INSERT ON "disbursements"."disbursement_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "disbursements".disbursement_audit_log_hash_chain();

REVOKE UPDATE, DELETE ON "disbursements"."disbursement_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "disbursements"."disbursement_audit_log" FROM PUBLIC;
