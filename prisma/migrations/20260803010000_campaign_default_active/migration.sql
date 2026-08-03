-- New campaigns start ACTIVE (no Draft step required for day-to-day ops).
ALTER TABLE "campaigns"."campaigns"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
