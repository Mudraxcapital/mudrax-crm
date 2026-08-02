export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
