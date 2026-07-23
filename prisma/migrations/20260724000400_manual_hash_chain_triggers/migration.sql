-- ============================================================================
-- Migration 0005 — manual: hash-chain triggers (EXPAND, phase 2 — runs
-- after partitioning so each function/trigger is created exactly once,
-- directly on each table's final shape)
-- ============================================================================
-- platform-contracts.md §4 ("Tamper evidence"): "Each Audit Record is
-- hash-chained to the previous record within its own module's Audit Trail
-- ... Computing and verifying the chain is application/trigger logic, not
-- a Prisma concern — Prisma only preserves the two columns
-- (`recordHash`/`previousRecordHash`)." This migration is that trigger
-- logic, for the three tables that carry those two columns:
-- documents.audit_trail, notifications.communication_log,
-- ai_core.ai_audit_log.
--
-- Design, identical across all three functions below:
--   1. Take a transaction-scoped advisory lock keyed to the target table,
--      so concurrent inserters serialize around "what is the current chain
--      head" instead of racing to read the same previous hash and forking
--      the chain. This is a deliberate, documented throughput trade-off —
--      see "Known Risks" #8 in platform-contracts.md, which already
--      anticipates hash-chain scaling being addressed later via periodic
--      checkpointing to an independent store, not by this migration.
--   2. Read the current chain head (the most recently inserted row's
--      `recordHash`) and assign it to `NEW."previousRecordHash"` (NULL for
--      the very first row in the table).
--   3. Compute `NEW."recordHash"` as the hex-encoded SHA-256 digest of a
--      deterministic, delimiter-joined concatenation of every business
--      column plus the previous hash. `sha256()` operating on `bytea` is a
--      built-in PostgreSQL core function since v14 — no extension
--      (`pgcrypto` et al.) is required.
--
-- A direct data-store edit that skips the application (and therefore this
-- trigger) is exactly the tamper scenario this chain is meant to make
-- provable, not preventable — recomputing the chain from row 1 and
-- comparing is the verification procedure; that verification job is
-- outside this migration's scope (it is read-only tooling, not DDL).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- documents.audit_trail
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "documents".audit_trail_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('documents.audit_trail', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "documents"."audit_trail"
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

CREATE TRIGGER audit_trail_hash_chain_biu
  BEFORE INSERT ON "documents"."audit_trail"
  FOR EACH ROW EXECUTE FUNCTION "documents".audit_trail_hash_chain();

-- ----------------------------------------------------------------------------
-- notifications.communication_log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "notifications".communication_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('notifications.communication_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "notifications"."communication_log"
  ORDER BY "occurredAt" DESC, "id" DESC
  LIMIT 1;

  NEW."previousRecordHash" := prev_hash;

  payload := concat_ws('|',
    NEW."id"::text,
    NEW."organizationId"::text,
    NEW."notificationId"::text,
    coalesce(NEW."notificationDeliveryId"::text, ''),
    NEW."eventType",
    coalesce(NEW."details"::text, ''),
    NEW."occurredAt"::text,
    coalesce(prev_hash, '')
  );

  NEW."recordHash" := encode(sha256(convert_to(payload, 'UTF8')), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER communication_log_hash_chain_biu
  BEFORE INSERT ON "notifications"."communication_log"
  FOR EACH ROW EXECUTE FUNCTION "notifications".communication_log_hash_chain();

-- ----------------------------------------------------------------------------
-- ai_core.ai_audit_log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "ai_core".ai_audit_log_hash_chain() RETURNS trigger AS $$
DECLARE
  prev_hash varchar(128);
  payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('ai_core.ai_audit_log', 0));

  SELECT "recordHash" INTO prev_hash
  FROM "ai_core"."ai_audit_log"
  ORDER BY "occurredAt" DESC, "id" DESC
  LIMIT 1;

  NEW."previousRecordHash" := prev_hash;

  payload := concat_ws('|',
    NEW."id"::text,
    coalesce(NEW."organizationId"::text, ''),
    NEW."occurredAt"::text,
    NEW."actorType"::text,
    coalesce(NEW."actorId"::text, ''),
    NEW."action",
    NEW."targetType",
    NEW."targetId"::text,
    coalesce(NEW."correlationId"::text, ''),
    coalesce(NEW."details"::text, ''),
    coalesce(prev_hash, '')
  );

  NEW."recordHash" := encode(sha256(convert_to(payload, 'UTF8')), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_audit_log_hash_chain_biu
  BEFORE INSERT ON "ai_core"."ai_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "ai_core".ai_audit_log_hash_chain();
