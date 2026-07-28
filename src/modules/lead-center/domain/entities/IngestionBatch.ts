// ============================================================================
// src/modules/lead-center/domain/entities/IngestionBatch.ts
// ============================================================================

export const INGESTION_BATCH_STATUSES = ["RECEIVED", "PROCESSING", "STORED", "FAILED"] as const;
export type IngestionBatchStatus = (typeof INGESTION_BATCH_STATUSES)[number];

export interface IngestionBatch {
  id: string;
  organizationId: string;
  sourceBucketId: string;
  sourceCode: string;
  receivedByUserId: string | null;
  sourceFileName: string | null;
  connectorRef: string | null;
  status: IngestionBatchStatus;
  totalCount: number;
  storedCount: number;
  duplicateCount: number;
  invalidCount: number;
  ownerManagerId: string | null;
  ownerTeamLeadId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface LeadCenterSourceBucket {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
