-- ============================================================================
-- Migration 0010 — manual: deferred constraints (MIGRATE, phase 4)
-- ============================================================================
-- PostgreSQL's one true "deferred constraint" primitive is the
-- CONSTRAINT TRIGGER: an AFTER-ROW trigger that participates in
-- `DEFERRABLE` / `SET CONSTRAINTS` semantics the same way a native
-- UNIQUE/FK/EXCLUDE constraint does, instead of firing (and possibly
-- rejecting the statement) immediately after every single row-level
-- write. This codebase's own schema comments identify exactly two
-- invariants that (a) span multiple sibling rows, so cannot be a plain
-- column CHECK, and (b) explicitly call for
-- `CREATE CONSTRAINT TRIGGER ... AFTER INSERT OR UPDATE ...` rather than a
-- plain `CREATE TRIGGER`. Both are declared `DEFERRABLE INITIALLY
-- DEFERRED` here — deferred to end-of-transaction, not merely deferrable —
-- because both invariants are only meant to hold on the FINAL state of a
-- multi-statement business transaction, not after each individual
-- statement inside it:
--
--   1. disbursements.disbursements — "the first Disbursement against a
--      Loan Application creates the Loan Account; every subsequent
--      Disbursement for that Application adds to the same Loan Account"
--      (disbursements.md). A transaction that inserts tranche 1 with
--      `loanAccountId IS NULL`, then (within the same transaction, per
--      this codebase's modular-monolith, single-deployable-app
--      architecture — ADR 0001) creates the Loan Account and backfills
--      that same row's `loanAccountId`, must not be rejected by an
--      immediate check that only ever sees the transient, mid-transaction
--      "one null row" state as if it were final.
--   2. ai_governance.ai_experiment_variants — "allocations across variants
--      of one experiment must sum to <= 100." Building up an Experiment's
--      variant list is naturally a multi-INSERT transaction; an immediate
--      per-row check would reject every insert after the first one until
--      the very last variant brings the running total back under 100
--      (impossible if variants are inserted in an order where an
--      intermediate state never itself sums to <= 100, e.g. two 60% rows
--      followed by a corrective UPDATE) — deferring to commit is the only
--      way this rule can be enforced without also constraining insert
--      order.
--
-- Ordering: independent of every other manual migration in this initial
-- layer; placed after the CHECK-constraint and partial-unique-index
-- migrations only to keep "structural" (FK/partition), "static
-- per-row" (CHECK), "per-column-set" (partial unique/exclusion), and
-- "cross-row/deferred" constraints grouped in that increasing order of
-- mechanism complexity.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- disbursements.disbursements
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "disbursements".enforce_first_tranche_creates_account() RETURNS trigger AS $$
DECLARE
  null_count int;
  min_tranche int;
  null_row_tranche int;
BEGIN
  SELECT
    count(*) FILTER (WHERE "loanAccountId" IS NULL),
    min("trancheNumber"),
    min("trancheNumber") FILTER (WHERE "loanAccountId" IS NULL)
  INTO null_count, min_tranche, null_row_tranche
  FROM "disbursements"."disbursements"
  WHERE "loanApplicationId" = NEW."loanApplicationId";

  IF null_count > 1 THEN
    RAISE EXCEPTION
      'Loan Application % has % Disbursements with a NULL loan_account_id; at most one (the tranche that creates the Loan Account) is allowed',
      NEW."loanApplicationId", null_count;
  END IF;

  IF null_count = 1 AND null_row_tranche IS DISTINCT FROM min_tranche THEN
    RAISE EXCEPTION
      'The Disbursement with a NULL loan_account_id for Loan Application % must be its lowest tranche_number (expected %, found %)',
      NEW."loanApplicationId", min_tranche, null_row_tranche;
  END IF;

  RETURN NULL; -- return value of an AFTER trigger is ignored
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER disbursements_first_tranche_account_check
  AFTER INSERT OR UPDATE ON "disbursements"."disbursements"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "disbursements".enforce_first_tranche_creates_account();

-- ----------------------------------------------------------------------------
-- ai_governance.ai_experiment_variants
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "ai_governance".enforce_experiment_variant_allocation_sum() RETURNS trigger AS $$
DECLARE
  affected_experiment_id uuid;
  total_allocation numeric;
BEGIN
  affected_experiment_id := COALESCE(NEW."aiExperimentId", OLD."aiExperimentId");

  SELECT COALESCE(sum("trafficAllocationPercentage"), 0) INTO total_allocation
  FROM "ai_governance"."ai_experiment_variants"
  WHERE "aiExperimentId" = affected_experiment_id;

  IF total_allocation > 100 THEN
    RAISE EXCEPTION
      'AI Experiment % variant traffic allocations sum to % (must be <= 100)',
      affected_experiment_id, total_allocation;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ai_experiment_variants_allocation_sum_check
  AFTER INSERT OR UPDATE OR DELETE ON "ai_governance"."ai_experiment_variants"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "ai_governance".enforce_experiment_variant_allocation_sum();
