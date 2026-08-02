/**
 * Serializable Campaign contract (mirrors CampaignDto from the web CRM).
 */

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  /** YYYY-MM-DD or null */
  startDate: string | null;
  /** YYYY-MM-DD or null */
  endDate: string | null;
  createdByUserId: string;
  ownerManagerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListResponse {
  data: Campaign[];
  meta?: {
    limit?: number;
    offset?: number;
  };
}

export interface CampaignResponse {
  data: Campaign;
}
