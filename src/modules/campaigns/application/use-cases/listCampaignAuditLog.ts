// ============================================================================
// src/modules/campaigns/application/use-cases/listCampaignAuditLog.ts
//
// Read-only Audit Trail access for one Campaign, and for the whole
// Organization (the latter backs Activity Timeline / CRM Dashboard
// "Recent Activities").
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditRecord } from "../../domain/entities/CampaignAuditRecord";

export function makeListCampaignAuditLog(repository: CampaignRepository) {
  return async function listCampaignAuditLog(campaignId: string): Promise<CampaignAuditRecord[]> {
    return repository.listAuditLog(campaignId);
  };
}

export function makeListRecentCampaignActivity(repository: CampaignRepository) {
  return async function listRecentCampaignActivity(
    organizationId: string,
    limit = 20,
  ): Promise<CampaignAuditRecord[]> {
    return repository.listRecentAuditLog(organizationId, limit);
  };
}
