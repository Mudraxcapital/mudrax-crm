// ============================================================================
// src/modules/leads/domain/repositories/ImportBatchRepository.ts
// ============================================================================

import type { ImportBatch, ImportRow, RowParseStatus } from "../entities/ImportBatch";

export interface CreateImportBatchData {
  organizationId: string;
  uploadedByUserId: string;
  leadSourceId: string;
  campaignId?: string | null;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  sourceFileName: string;
}

export interface CreateImportRowData {
  importBatchId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  parseStatus: RowParseStatus;
  parseErrors?: string[] | null;
  resolvedCustomerId?: string | null;
}

export interface ImportBatchRepository {
  findById(id: string): Promise<ImportBatch | null>;
  list(organizationId: string, limit?: number): Promise<ImportBatch[]>;
  create(data: CreateImportBatchData): Promise<ImportBatch>;
  updateCounts(
    id: string,
    data: {
      status?: ImportBatch["status"];
      totalRowCount?: number;
      createdRowCount?: number;
      duplicateRowCount?: number;
      parsedAt?: Date | null;
      committedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<ImportBatch>;
  createRows(rows: CreateImportRowData[]): Promise<ImportRow[]>;
  listRows(importBatchId: string): Promise<ImportRow[]>;
}
