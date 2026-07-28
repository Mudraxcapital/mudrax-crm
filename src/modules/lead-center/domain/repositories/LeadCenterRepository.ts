// ============================================================================
// src/modules/lead-center/domain/repositories/LeadCenterRepository.ts
// ============================================================================

import type { IngestionBatch, LeadCenterSourceBucket } from "../entities/IngestionBatch";
import type {
  StagedDuplicateStatus,
  StagedImportStatus,
  StagedLead,
  StagedLeadStatus,
  StagedValidationStatus,
} from "../entities/StagedLead";
import type { LeadCenterAuditActor } from "../entities/LeadCenterAuditRecord";

export interface ListStagedLeadsFilter {
  sourceCode?: string;
  /** When set, matches any of these source codes (overrides `sourceCode`). */
  sourceCodes?: string[];
  status?: StagedLeadStatus;
  duplicateStatus?: StagedDuplicateStatus;
  validationStatus?: StagedValidationStatus;
  importStatus?: StagedImportStatus;
  ownerManagerId?: string;
  ownerTeamLeadId?: string;
  ingestionBatchId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSourceBucketData {
  organizationId: string;
  code: string;
  name: string;
  sortOrder?: number;
}

export interface CreateIngestionBatchData {
  organizationId: string;
  sourceBucketId: string;
  sourceCode: string;
  receivedByUserId?: string | null;
  sourceFileName?: string | null;
  connectorRef?: string | null;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface CreateStagedLeadData {
  organizationId: string;
  ingestionBatchId?: string | null;
  sourceBucketId: string;
  sourceCode: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  campaignNameHint?: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown> | null;
  status?: StagedLeadStatus;
  duplicateStatus?: StagedDuplicateStatus;
  validationStatus?: StagedValidationStatus;
  importStatus?: StagedImportStatus;
  matchReason?: string | null;
  matchedLeadId?: string | null;
  matchedCustomerId?: string | null;
  validationErrors?: string[] | null;
  tags?: string[];
  branchId?: string | null;
  assignedManagerUserId?: string | null;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
}

export interface UpdateIngestionBatchCountsData {
  status?: IngestionBatch["status"];
  totalCount?: number;
  storedCount?: number;
  duplicateCount?: number;
  invalidCount?: number;
  completedAt?: Date | null;
}

export interface SourceBucketCount {
  sourceCode: string;
  pendingCount: number;
  totalCount: number;
}

export interface UpdateStagedLeadPatch {
  status?: StagedLeadStatus;
  duplicateStatus?: StagedDuplicateStatus;
  validationStatus?: StagedValidationStatus;
  importStatus?: StagedImportStatus;
  matchReason?: string | null;
  matchedLeadId?: string | null;
  matchedCustomerId?: string | null;
  validationErrors?: string[] | null;
  tags?: string[];
  branchId?: string | null;
  assignedManagerUserId?: string | null;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  importedLeadId?: string | null;
  importedCampaignId?: string | null;
  importedAt?: Date | null;
  archivedAt?: Date | null;
}

export interface LeadCenterRepository {
  ensureSourceBuckets(
    organizationId: string,
    buckets: Array<{ code: string; name: string; sortOrder: number }>,
  ): Promise<LeadCenterSourceBucket[]>;

  findSourceBucketByCode(
    organizationId: string,
    code: string,
  ): Promise<LeadCenterSourceBucket | null>;

  listSourceBuckets(organizationId: string): Promise<LeadCenterSourceBucket[]>;

  countBySource(organizationId: string, filter?: ListStagedLeadsFilter): Promise<SourceBucketCount[]>;

  createIngestionBatch(data: CreateIngestionBatchData): Promise<IngestionBatch>;

  updateIngestionBatch(
    id: string,
    data: UpdateIngestionBatchCountsData,
  ): Promise<IngestionBatch>;

  findIngestionBatchById(id: string): Promise<IngestionBatch | null>;

  createStagedLeads(rows: CreateStagedLeadData[]): Promise<StagedLead[]>;

  findStagedLeadById(id: string): Promise<StagedLead | null>;

  findStagedLeadsByIds(organizationId: string, ids: string[]): Promise<StagedLead[]>;

  listStagedLeads(organizationId: string, filter?: ListStagedLeadsFilter): Promise<StagedLead[]>;

  countStagedLeads(organizationId: string, filter?: ListStagedLeadsFilter): Promise<number>;

  updateStagedLeads(
    organizationId: string,
    ids: string[],
    patch: UpdateStagedLeadPatch,
  ): Promise<number>;

  appendAudit(input: {
    organizationId: string;
    actor: LeadCenterAuditActor;
    action: string;
    targetType: string;
    targetId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    correlationId?: string | null;
  }): Promise<void>;
}
