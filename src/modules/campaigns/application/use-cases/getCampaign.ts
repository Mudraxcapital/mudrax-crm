// ============================================================================
// src/modules/campaigns/application/use-cases/getCampaign.ts
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import { CampaignNotFoundError } from "../../domain/errors/CampaignErrors";
import { toCampaignDto, type CampaignDto } from "../dto/CampaignDto";

export function makeGetCampaign(repository: CampaignRepository) {
  return async function getCampaign(id: string): Promise<CampaignDto> {
    const campaign = await repository.findById(id);
    if (!campaign) {
      throw new CampaignNotFoundError(id);
    }
    return toCampaignDto(campaign);
  };
}

export function makeListCampaigns(repository: CampaignRepository) {
  return async function listCampaigns(organizationId: string): Promise<CampaignDto[]> {
    const campaigns = await repository.list(organizationId);
    return campaigns.map(toCampaignDto);
  };
}

export function makeCountCampaigns(repository: CampaignRepository) {
  return async function countCampaigns(organizationId: string): Promise<number> {
    return repository.count(organizationId);
  };
}
