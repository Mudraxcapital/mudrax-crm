// ============================================================================
// src/modules/leads/application/dto/ImportBatchDto.ts
// ============================================================================

import type { ImportBatch, ImportRow } from "../../domain/entities/ImportBatch";

export interface ImportBatchDto {
  id: string;
  organizationId: string;
  uploadedByUserId: string;
  leadSourceId: string;
  campaignId: string | null;
  sourceFileName: string;
  status: ImportBatch["status"];
  totalRowCount: number;
  createdRowCount: number;
  duplicateRowCount: number;
  createdAt: string;
  parsedAt: string | null;
  committedAt: string | null;
  completedAt: string | null;
}

export interface ImportRowDto {
  id: string;
  importBatchId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  parseStatus: ImportRow["parseStatus"];
  parseErrors: string[] | null;
  resolvedCustomerId: string | null;
}

export function toImportBatchDto(batch: ImportBatch): ImportBatchDto {
  return {
    id: batch.id,
    organizationId: batch.organizationId,
    uploadedByUserId: batch.uploadedByUserId,
    leadSourceId: batch.leadSourceId,
    campaignId: batch.campaignId,
    sourceFileName: batch.sourceFileName,
    status: batch.status,
    totalRowCount: batch.totalRowCount,
    createdRowCount: batch.createdRowCount,
    duplicateRowCount: batch.duplicateRowCount,
    createdAt: batch.createdAt.toISOString(),
    parsedAt: batch.parsedAt ? batch.parsedAt.toISOString() : null,
    committedAt: batch.committedAt ? batch.committedAt.toISOString() : null,
    completedAt: batch.completedAt ? batch.completedAt.toISOString() : null,
  };
}

export function toImportRowDto(row: ImportRow): ImportRowDto {
  return {
    id: row.id,
    importBatchId: row.importBatchId,
    rowNumber: row.rowNumber,
    rawData: row.rawData,
    parseStatus: row.parseStatus,
    parseErrors: row.parseErrors,
    resolvedCustomerId: row.resolvedCustomerId,
  };
}
