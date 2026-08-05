-- Temporary holiday / cover assignment on Leads.
-- permanentAssigneeUserId + temporaryAssigneeUntil mark a temp cover; a jobs
-- tick reverts currentAssigneeUserId when temporaryAssigneeUntil has passed.

ALTER TABLE "leads"."leads"
  ADD COLUMN "permanentAssigneeUserId" UUID,
  ADD COLUMN "temporaryAssigneeUntil" TIMESTAMP(3);

CREATE INDEX "leads_temporaryAssigneeUntil_idx"
  ON "leads"."leads" ("temporaryAssigneeUntil");

ALTER TYPE "leads"."assignment_type" ADD VALUE IF NOT EXISTS 'TEMPORARY_REASSIGNMENT';
