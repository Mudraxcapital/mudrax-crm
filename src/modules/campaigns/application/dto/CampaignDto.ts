// ============================================================================
// src/modules/campaigns/application/dto/CampaignDto.ts
//
// What the Campaign aggregate's use-cases return to the presentation
// layer — a plain, serializable shape (dates as ISO strings).
// ============================================================================

import type { Campaign } from "../../domain/entities/Campaign";

export interface CampaignDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: Campaign["status"];
  startDate: string | null;
  endDate: string | null;
  createdByUserId: string;
  ownerManagerId: string;
  createdAt: string;
  updatedAt: string;
}

export function toCampaignDto(campaign: Campaign): CampaignDto {
  return {
    id: campaign.id,
    organizationId: campaign.organizationId,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    startDate: campaign.startDate ? campaign.startDate.toISOString().slice(0, 10) : null,
    endDate: campaign.endDate ? campaign.endDate.toISOString().slice(0, 10) : null,
    createdByUserId: campaign.createdByUserId,
    ownerManagerId: campaign.ownerManagerId,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}
