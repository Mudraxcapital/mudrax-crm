// ============================================================================
// src/modules/leads/infrastructure/repositories/PrismaImportBatchRepository.ts
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import type {
  CreateImportBatchData,
  CreateImportRowData,
  ImportBatchRepository,
} from "../../domain/repositories/ImportBatchRepository";
import type { ImportBatch, ImportRow } from "../../domain/entities/ImportBatch";
import { toImportBatch, toImportRow, toJson } from "../mappers/importBatchMapper";

export class PrismaImportBatchRepository implements ImportBatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ImportBatch | null> {
    const row = await this.prisma.importBatch.findUnique({ where: { id } });
    return row ? toImportBatch(row) : null;
  }

  async list(organizationId: string, limit = 50): Promise<ImportBatch[]> {
    const rows = await this.prisma.importBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toImportBatch);
  }

  async create(data: CreateImportBatchData): Promise<ImportBatch> {
    const row = await this.prisma.importBatch.create({
      data: {
        organizationId: data.organizationId,
        uploadedByUserId: data.uploadedByUserId,
        leadSourceId: data.leadSourceId,
        campaignId: data.campaignId ?? null,
        ownerManagerId: data.ownerManagerId ?? null,
        ownerTeamLeadId: data.ownerTeamLeadId ?? null,
        sourceFileName: data.sourceFileName,
        status: "UPLOADED",
      },
    });
    return toImportBatch(row);
  }

  async updateCounts(
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
  ): Promise<ImportBatch> {
    const row = await this.prisma.importBatch.update({
      where: { id },
      data: {
        status: data.status,
        totalRowCount: data.totalRowCount,
        createdRowCount: data.createdRowCount,
        duplicateRowCount: data.duplicateRowCount,
        parsedAt: data.parsedAt,
        committedAt: data.committedAt,
        completedAt: data.completedAt,
      },
    });
    return toImportBatch(row);
  }

  async createRows(rows: CreateImportRowData[]): Promise<ImportRow[]> {
    if (rows.length === 0) return [];
    const chunkSize = 500;
    for (let offset = 0; offset < rows.length; offset += chunkSize) {
      const chunk = rows.slice(offset, offset + chunkSize);
      await this.prisma.importRow.createMany({
        data: chunk.map((row) => ({
          importBatchId: row.importBatchId,
          rowNumber: row.rowNumber,
          rawData: toJson(row.rawData),
          parseStatus: row.parseStatus,
          parseErrors: row.parseErrors ? toJson(row.parseErrors) : undefined,
          resolvedCustomerId: row.resolvedCustomerId ?? null,
        })),
      });
    }
    return this.listRows(rows[0]!.importBatchId);
  }

  async listRows(importBatchId: string): Promise<ImportRow[]> {
    const rows = await this.prisma.importRow.findMany({
      where: { importBatchId },
      orderBy: { rowNumber: "asc" },
    });
    return rows.map(toImportRow);
  }
}
