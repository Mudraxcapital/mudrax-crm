// ============================================================================
// src/modules/campaigns/domain/entities/CampaignAssignment.ts
//
// The auditable allocation *decision* distributing Campaign Leads among
// active members (campaigns.md — "a decision, not a write"; this module
// never writes Lead state directly, it calls `leads`' public API to
// initiate each per-Lead assignment).
// ============================================================================

export const ALLOCATION_METHODS = [
  "EQUAL",
  "PERCENTAGE",
  "ROUND_ROBIN",
  "RANDOM",
  "MANUAL",
] as const;
export type AllocationMethod = (typeof ALLOCATION_METHODS)[number];

export const CAMPAIGN_ASSIGNMENT_STATUSES = [
  "PENDING",
  "EXECUTING",
  "COMPLETED",
  "FAILED",
] as const;
export type CampaignAssignmentStatus = (typeof CAMPAIGN_ASSIGNMENT_STATUSES)[number];

export interface CampaignAssignment {
  id: string;
  campaignId: string;
  initiatedByUserId: string;
  allocationMethod: AllocationMethod;
  targetLeadCount: number;
  status: CampaignAssignmentStatus;
  executedAt: Date | null;
  createdAt: Date;
}

/** One member's decided share of a Campaign Assignment's allocation. */
export interface CampaignAssignmentAllocation {
  id: string;
  campaignAssignmentId: string;
  userId: string;
  allocatedPercentage: number | null;
  allocatedCount: number | null;
}
