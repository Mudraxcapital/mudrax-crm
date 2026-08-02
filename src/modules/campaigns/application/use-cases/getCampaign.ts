// ============================================================================
// src/modules/campaigns/application/use-cases/getCampaign.ts
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import { CampaignNotFoundError } from "../../domain/errors/CampaignErrors";
import { toCampaignDto, type CampaignDto } from "../dto/CampaignDto";
import { PERSONAL_CAMPAIGN_NAME } from "./ensurePersonalCampaign";

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
  return async function listCampaigns(
    organizationId: string,
    filter?: { ownerManagerId?: string },
  ): Promise<CampaignDto[]> {
    const campaigns = await repository.list(organizationId, filter);
    return campaigns.map(toCampaignDto);
  };
}

/**
 * Campaigns the User is an active member of — Caller "My Campaigns" surface.
 * Does not require `campaign.view` (Team Lead+); membership alone is enough.
 */
export function makeListCampaignsForMember(repository: CampaignRepository) {
  return async function listCampaignsForMember(userId: string): Promise<CampaignDto[]> {
    const memberships = await repository.listActiveMembershipsForUser(userId);
    const campaigns: CampaignDto[] = [];
    for (const membership of memberships) {
      const campaign = await repository.findById(membership.campaignId);
      if (campaign && (campaign.status === "ACTIVE" || campaign.status === "PAUSED")) {
        campaigns.push(toCampaignDto(campaign));
      }
    }
    // Personal Campaign first so Caller/app defaults land on single-add leads.
    const personalName = PERSONAL_CAMPAIGN_NAME.toLowerCase();
    return campaigns.sort((a, b) => {
      const aPersonal = a.name.trim().toLowerCase() === personalName;
      const bPersonal = b.name.trim().toLowerCase() === personalName;
      if (aPersonal !== bPersonal) return aPersonal ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };
}

export function makeCountCampaigns(repository: CampaignRepository) {
  return async function countCampaigns(
    organizationId: string,
    filter?: { ownerManagerId?: string },
  ): Promise<number> {
    return repository.count(organizationId, filter);
  };
}
