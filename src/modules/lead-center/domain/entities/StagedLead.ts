// ============================================================================
// src/modules/lead-center/domain/entities/StagedLead.ts
// ============================================================================

export const STAGED_LEAD_STATUSES = [
  "PENDING_REVIEW",
  "DUPLICATE_CHECK",
  "VALIDATION",
  "MANAGER_REVIEW",
  "READY_TO_IMPORT",
  "IMPORTED",
  "ARCHIVED",
  "DELETED",
] as const;
export type StagedLeadStatus = (typeof STAGED_LEAD_STATUSES)[number];

export const STAGED_DUPLICATE_STATUSES = ["UNKNOWN", "NONE", "POSSIBLE", "EXACT"] as const;
export type StagedDuplicateStatus = (typeof STAGED_DUPLICATE_STATUSES)[number];

export const STAGED_VALIDATION_STATUSES = ["PENDING", "VALID", "INVALID"] as const;
export type StagedValidationStatus = (typeof STAGED_VALIDATION_STATUSES)[number];

export const STAGED_IMPORT_STATUSES = ["NOT_IMPORTED", "QUEUED", "IMPORTED", "FAILED"] as const;
export type StagedImportStatus = (typeof STAGED_IMPORT_STATUSES)[number];

export interface StagedLead {
  id: string;
  organizationId: string;
  ingestionBatchId: string | null;
  sourceBucketId: string;
  sourceCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  campaignNameHint: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown> | null;
  status: StagedLeadStatus;
  duplicateStatus: StagedDuplicateStatus;
  validationStatus: StagedValidationStatus;
  importStatus: StagedImportStatus;
  matchReason: string | null;
  matchedLeadId: string | null;
  matchedCustomerId: string | null;
  validationErrors: string[] | null;
  tags: string[];
  branchId: string | null;
  assignedManagerUserId: string | null;
  ownerManagerId: string | null;
  ownerTeamLeadId: string | null;
  importedLeadId: string | null;
  importedCampaignId: string | null;
  importedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
