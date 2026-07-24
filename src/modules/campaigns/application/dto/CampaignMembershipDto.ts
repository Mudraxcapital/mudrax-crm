// ============================================================================
// src/modules/campaigns/application/dto/CampaignMembershipDto.ts
// ============================================================================

import type { CampaignMembership } from "../../domain/entities/CampaignMembership";

export interface CampaignMembershipDto {
  campaignId: string;
  userId: string;
  allocationWeight: number;
  isActive: boolean;
  joinedAt: string;
  leftAt: string | null;
}

export function toCampaignMembershipDto(membership: CampaignMembership): CampaignMembershipDto {
  return {
    campaignId: membership.campaignId,
    userId: membership.userId,
    allocationWeight: membership.allocationWeight,
    isActive: membership.isActive,
    joinedAt: membership.joinedAt.toISOString(),
    leftAt: membership.leftAt ? membership.leftAt.toISOString() : null,
  };
}
