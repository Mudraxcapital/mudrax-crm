-- Dynamic Lead Field Management: expand custom_field_definitions into the
-- master field registry (system + custom) and enrich value storage.

-- Field group / status enums
CREATE TYPE "leads"."lead_field_group" AS ENUM ('PRIMARY', 'SECONDARY', 'HIDDEN');
CREATE TYPE "leads"."lead_field_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- Expand custom_field_type with the full supported set (keep SINGLE_SELECT).
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'TEXTAREA';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'CURRENCY';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'PHONE';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'EMAIL';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'DROPDOWN';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'MULTI_SELECT';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'RADIO';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'CHECKBOX';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'DATE_TIME';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'BOOLEAN';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'URL';
ALTER TYPE "leads"."custom_field_type" ADD VALUE IF NOT EXISTS 'FILE';

-- Definition metadata columns
ALTER TABLE "leads"."custom_field_definitions"
  ADD COLUMN IF NOT EXISTS "internalKey" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "fieldGroup" "leads"."lead_field_group" NOT NULL DEFAULT 'SECONDARY',
  ADD COLUMN IF NOT EXISTS "status" "leads"."lead_field_status" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isSearchable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isFilterable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isImportable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isExportable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "defaultValue" TEXT,
  ADD COLUMN IF NOT EXISTS "validationRules" JSONB,
  ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "systemColumn" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "createdByUserId" UUID;

-- Backfill internalKey for any pre-existing custom definitions.
UPDATE "leads"."custom_field_definitions"
SET "internalKey" = lower(regexp_replace(trim("name"), '[^a-zA-Z0-9]+', '_', 'g'))
WHERE "internalKey" IS NULL;

-- Ensure uniqueness even when names collide after slugify.
UPDATE "leads"."custom_field_definitions" AS c
SET "internalKey" = c."internalKey" || '_' || substr(replace(c."id"::text, '-', ''), 1, 8)
WHERE EXISTS (
  SELECT 1
  FROM "leads"."custom_field_definitions" AS other
  WHERE other."organizationId" = c."organizationId"
    AND other."internalKey" = c."internalKey"
    AND other."id" <> c."id"
);

ALTER TABLE "leads"."custom_field_definitions"
  ALTER COLUMN "internalKey" SET NOT NULL;

-- Sync status from legacy isActive.
UPDATE "leads"."custom_field_definitions"
SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"leads"."lead_field_status"
                    ELSE 'INACTIVE'::"leads"."lead_field_status" END;

-- Note: new custom_field_type values (DROPDOWN, etc.) cannot be written in the
-- same transaction as ALTER TYPE ... ADD VALUE. Application code treats
-- SINGLE_SELECT as DROPDOWN; a follow-up seed/migration can remap rows.

CREATE UNIQUE INDEX IF NOT EXISTS "custom_field_definitions_organizationId_internalKey_key"
  ON "leads"."custom_field_definitions"("organizationId", "internalKey");

CREATE INDEX IF NOT EXISTS "custom_field_definitions_organizationId_status_displayOrder_idx"
  ON "leads"."custom_field_definitions"("organizationId", "status", "displayOrder");

-- Value storage enrichment
ALTER TABLE "leads"."lead_custom_field_values"
  ADD COLUMN IF NOT EXISTS "valueDateTime" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "valueBoolean" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "valueJson" JSONB;

CREATE INDEX IF NOT EXISTS "lead_custom_field_values_leadId_idx"
  ON "leads"."lead_custom_field_values"("leadId");
