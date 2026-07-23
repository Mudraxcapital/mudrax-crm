-- ============================================================================
-- Migration 0011 — manual: trigger-based validation (MIGRATE, phase 4)
-- ============================================================================
-- leads.prisma: Lead — "A Lead cannot transition into a Closed-Lost stage
-- without a Lost Reason" (leads.md). This is a cross-table business rule:
-- whether `currentStageId` represents "Closed-Lost" depends on the
-- referenced `leads.lead_stages` row's `bucket`/`closeOutcome` columns, not
-- on any column of `leads.leads` itself, so it cannot be a plain CHECK
-- constraint (Postgres CHECK constraints may only reference columns of the
-- same row). Unlike migration 0010's two constraint triggers, this rule
-- must hold true immediately after every single INSERT/UPDATE of a Lead —
-- there is no legitimate multi-statement transaction where a Lead is
-- meant to sit in Closed-Lost without a Lost Reason even momentarily — so
-- this is a plain (non-deferrable) `BEFORE` trigger, exactly as named in
-- the schema's own comment.
-- ============================================================================

CREATE OR REPLACE FUNCTION "leads".enforce_lost_reason_on_closed_lost() RETURNS trigger AS $$
DECLARE
  stage_bucket "leads"."stage_bucket";
  stage_close_outcome "leads"."close_outcome";
BEGIN
  SELECT "bucket", "closeOutcome" INTO stage_bucket, stage_close_outcome
  FROM "leads"."lead_stages"
  WHERE "id" = NEW."currentStageId";

  IF stage_bucket = 'CLOSED' AND stage_close_outcome = 'LOST' AND NEW."lostReasonId" IS NULL THEN
    RAISE EXCEPTION
      'Lead % cannot move into a Closed-Lost stage (%) without a lostReasonId',
      NEW."id", NEW."currentStageId";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_lost_reason_required
  BEFORE INSERT OR UPDATE ON "leads"."leads"
  FOR EACH ROW EXECUTE FUNCTION "leads".enforce_lost_reason_on_closed_lost();
