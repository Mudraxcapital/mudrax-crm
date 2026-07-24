// ============================================================================
// src/modules/leads/domain/entities/SavedView.ts
//
// A User's saved filter/query preset over the Lead list (leads.md).
// ============================================================================

export interface LeadFilterConfig {
  search?: string;
  currentStageId?: string;
  leadSourceId?: string;
  campaignId?: string;
  assignedToUserId?: string;
  customerId?: string;
}

export interface SavedView {
  id: string;
  ownerUserId: string;
  name: string;
  filterConfig: LeadFilterConfig;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}
