-- Hot-path composites for hierarchy-scoped Lead list / pipeline / export / import.
CREATE INDEX IF NOT EXISTS "leads_organizationId_ownerManagerId_idx"
  ON "leads"."leads"("organizationId", "ownerManagerId");

CREATE INDEX IF NOT EXISTS "leads_organizationId_ownerTeamLeadId_idx"
  ON "leads"."leads"("organizationId", "ownerTeamLeadId");

CREATE INDEX IF NOT EXISTS "leads_organizationId_currentAssigneeUserId_idx"
  ON "leads"."leads"("organizationId", "currentAssigneeUserId");

CREATE INDEX IF NOT EXISTS "leads_organizationId_currentStageId_idx"
  ON "leads"."leads"("organizationId", "currentStageId");

CREATE INDEX IF NOT EXISTS "leads_organizationId_campaignId_idx"
  ON "leads"."leads"("organizationId", "campaignId");

CREATE INDEX IF NOT EXISTS "leads_organizationId_createdAt_idx"
  ON "leads"."leads"("organizationId", "createdAt");
