// ============================================================================
// src/modules/campaigns/domain/entities/CampaignMembership.ts
//
// Which Users may work the Campaign and their allocation configuration
// (campaigns.md — "does not create Caller identities", references Users
// owned by `users`).
// ============================================================================

export interface CampaignMembership {
  campaignId: string;
  userId: string;
  allocationWeight: number;
  isActive: boolean;
  joinedAt: Date;
  leftAt: Date | null;
}
