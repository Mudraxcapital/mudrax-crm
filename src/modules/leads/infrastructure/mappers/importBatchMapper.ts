// ============================================================================
// src/modules/leads/infrastructure/mappers/importBatchMapper.ts
// ============================================================================

import type {
  ImportBatch as PrismaImportBatch,
  ImportRow as PrismaImportRow,
  Prisma,
} from "@prisma/client";
import type { ImportBatch, ImportRow } from "../../domain/entities/ImportBatch";

export function toImportBatch(row: PrismaImportBatch): ImportBatch {
  return {
    id: row.id,
    organizationId: row.organizationId,
    uploadedByUserId: row.uploadedByUserId,
    leadSourceId: row.leadSourceId,
    campaignId: row.campaignId,
    sourceFileName: row.sourceFileName,
    status: row.status,
    totalRowCount: row.totalRowCount,
    createdRowCount: row.createdRowCount,
    duplicateRowCount: row.duplicateRowCount,
    createdAt: row.createdAt,
    parsedAt: row.parsedAt,
    committedAt: row.committedAt,
    completedAt: row.completedAt,
  };
}

export function toImportRow(row: PrismaImportRow): ImportRow {
  const raw =
    row.rawData && typeof row.rawData === "object" && !Array.isArray(row.rawData)
      ? (row.rawData as Record<string, unknown>)
      : {};
  const errors = Array.isArray(row.parseErrors)
    ? (row.parseErrors as unknown[]).filter((e): e is string => typeof e === "string")
    : null;

  return {
    id: row.id,
    importBatchId: row.importBatchId,
    rowNumber: row.rowNumber,
    rawData: raw,
    parseStatus: row.parseStatus,
    parseErrors: errors,
    resolvedCustomerId: row.resolvedCustomerId,
    createdAt: row.createdAt,
  };
}

export function toJson(value: Record<string, unknown> | string[]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
