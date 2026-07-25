// ============================================================================
// src/modules/leads/domain/entities/ImportBatch.ts
//
// Auditable bulk Lead intake unit (CSV upload) — leads.md.
// ============================================================================

export const IMPORT_BATCH_STATUSES = [
  "UPLOADED",
  "PARSED",
  "AWAITING_RESOLUTION",
  "RESOLVED",
  "COMMITTED",
  "COMPLETED",
] as const;
export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];

export const ROW_PARSE_STATUSES = ["PENDING", "PARSED", "INVALID"] as const;
export type RowParseStatus = (typeof ROW_PARSE_STATUSES)[number];

export interface ImportBatch {
  id: string;
  organizationId: string;
  uploadedByUserId: string;
  leadSourceId: string;
  campaignId: string | null;
  ownerManagerId: string | null;
  ownerTeamLeadId: string | null;
  sourceFileName: string;
  status: ImportBatchStatus;
  totalRowCount: number;
  createdRowCount: number;
  duplicateRowCount: number;
  createdAt: Date;
  parsedAt: Date | null;
  committedAt: Date | null;
  completedAt: Date | null;
}

export interface ImportRow {
  id: string;
  importBatchId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  parseStatus: RowParseStatus;
  parseErrors: string[] | null;
  resolvedCustomerId: string | null;
  createdAt: Date;
}
