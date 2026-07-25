-- Hierarchical ownership: every business row belongs to one Manager book.
-- Team Lead / Caller columns narrow visibility inside that book.

-- Campaigns (required owner — backfill from createdByUserId, then enforce NOT NULL)
ALTER TABLE "campaigns"."campaigns"
  ADD COLUMN IF NOT EXISTS "ownerManagerId" UUID;

UPDATE "campaigns"."campaigns"
SET "ownerManagerId" = "createdByUserId"
WHERE "ownerManagerId" IS NULL;

ALTER TABLE "campaigns"."campaigns"
  ALTER COLUMN "ownerManagerId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "campaigns_ownerManagerId_idx"
  ON "campaigns"."campaigns" ("ownerManagerId");

-- Customers
ALTER TABLE "customers"."customers"
  ADD COLUMN IF NOT EXISTS "ownerManagerId" UUID;

CREATE INDEX IF NOT EXISTS "customers_ownerManagerId_idx"
  ON "customers"."customers" ("ownerManagerId");

-- Leads
ALTER TABLE "leads"."leads"
  ADD COLUMN IF NOT EXISTS "ownerManagerId" UUID,
  ADD COLUMN IF NOT EXISTS "ownerTeamLeadId" UUID;

CREATE INDEX IF NOT EXISTS "leads_ownerManagerId_idx"
  ON "leads"."leads" ("ownerManagerId");

CREATE INDEX IF NOT EXISTS "leads_ownerTeamLeadId_idx"
  ON "leads"."leads" ("ownerTeamLeadId");

-- Backfill lead ownership from campaign when present
UPDATE "leads"."leads" AS l
SET "ownerManagerId" = c."ownerManagerId"
FROM "campaigns"."campaigns" AS c
WHERE l."campaignId" = c."id"
  AND l."ownerManagerId" IS NULL;

-- Import batches
ALTER TABLE "leads"."import_batches"
  ADD COLUMN IF NOT EXISTS "ownerManagerId" UUID,
  ADD COLUMN IF NOT EXISTS "ownerTeamLeadId" UUID;

CREATE INDEX IF NOT EXISTS "import_batches_ownerManagerId_idx"
  ON "leads"."import_batches" ("ownerManagerId");
