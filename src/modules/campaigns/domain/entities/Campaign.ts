// ============================================================================
// src/modules/campaigns/domain/entities/Campaign.ts
//
// Marketing/outbound Campaign lifecycle root (campaigns.md). Framework-free:
// no Prisma types leak past the infrastructure/mappers layer.
// ============================================================================

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Valid forward transitions (campaigns.md — Campaign Status lifecycle). */
export const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "COMPLETED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  startDate: Date | null;
  endDate: Date | null;
  createdByUserId: string;
  /** Hierarchical owner — Manager book this Campaign belongs to. */
  ownerManagerId: string;
  createdAt: Date;
  updatedAt: Date;
}
