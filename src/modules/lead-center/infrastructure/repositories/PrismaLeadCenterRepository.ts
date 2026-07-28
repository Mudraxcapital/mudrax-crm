// ============================================================================
// src/modules/lead-center/infrastructure/repositories/PrismaLeadCenterRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import type {
  CreateIngestionBatchData,
  CreateStagedLeadData,
  LeadCenterRepository,
  ListStagedLeadsFilter,
  SourceBucketCount,
  UpdateIngestionBatchCountsData,
  UpdateStagedLeadPatch,
} from "../../domain/repositories/LeadCenterRepository";
import type { IngestionBatch, LeadCenterSourceBucket } from "../../domain/entities/IngestionBatch";
import type { StagedLead } from "../../domain/entities/StagedLead";
import type { LeadCenterAuditActor } from "../../domain/entities/LeadCenterAuditRecord";
import {
  toIngestionBatch,
  toJson,
  toSourceBucket,
  toStagedLead,
} from "../mappers/leadCenterMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaLeadCenterRepository implements LeadCenterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureSourceBuckets(
    organizationId: string,
    buckets: Array<{ code: string; name: string; sortOrder: number }>,
  ): Promise<LeadCenterSourceBucket[]> {
    for (const bucket of buckets) {
      await this.prisma.leadCenterSourceBucket.upsert({
        where: {
          organizationId_code: { organizationId, code: bucket.code },
        },
        update: {
          name: bucket.name,
          sortOrder: bucket.sortOrder,
          isActive: true,
        },
        create: {
          organizationId,
          code: bucket.code,
          name: bucket.name,
          sortOrder: bucket.sortOrder,
          isActive: true,
        },
      });
    }
    return this.listSourceBuckets(organizationId);
  }

  async findSourceBucketByCode(
    organizationId: string,
    code: string,
  ): Promise<LeadCenterSourceBucket | null> {
    const row = await this.prisma.leadCenterSourceBucket.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    return row ? toSourceBucket(row) : null;
  }

  async listSourceBuckets(organizationId: string): Promise<LeadCenterSourceBucket[]> {
    const rows = await this.prisma.leadCenterSourceBucket.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toSourceBucket);
  }

  async countBySource(
    organizationId: string,
    filter?: ListStagedLeadsFilter,
  ): Promise<SourceBucketCount[]> {
    const where = this.buildStagedWhere(organizationId, {
      ...filter,
      status: filter?.status,
    });
    // Pending = not imported / archived / deleted
    const pendingWhere: Prisma.StagedLeadWhereInput = {
      ...where,
      status: { notIn: ["IMPORTED", "ARCHIVED", "DELETED"] },
      importStatus: { not: "IMPORTED" },
    };

    const [pendingGroups, totalGroups] = await Promise.all([
      this.prisma.stagedLead.groupBy({
        by: ["sourceCode"],
        where: pendingWhere,
        _count: { _all: true },
      }),
      this.prisma.stagedLead.groupBy({
        by: ["sourceCode"],
        where: this.buildStagedWhere(organizationId, filter),
        _count: { _all: true },
      }),
    ]);

    const pendingMap = new Map(pendingGroups.map((g) => [g.sourceCode, g._count._all]));
    const codes = new Set([
      ...pendingGroups.map((g) => g.sourceCode),
      ...totalGroups.map((g) => g.sourceCode),
    ]);

    return [...codes].map((sourceCode) => ({
      sourceCode,
      pendingCount: pendingMap.get(sourceCode) ?? 0,
      totalCount: totalGroups.find((g) => g.sourceCode === sourceCode)?._count._all ?? 0,
    }));
  }

  async createIngestionBatch(data: CreateIngestionBatchData): Promise<IngestionBatch> {
    const row = await this.prisma.ingestionBatch.create({
      data: {
        organizationId: data.organizationId,
        sourceBucketId: data.sourceBucketId,
        sourceCode: data.sourceCode,
        receivedByUserId: data.receivedByUserId ?? null,
        sourceFileName: data.sourceFileName ?? null,
        connectorRef: data.connectorRef ?? null,
        ownerManagerId: data.ownerManagerId ?? null,
        ownerTeamLeadId: data.ownerTeamLeadId ?? null,
        meta: data.meta ? toJson(data.meta) : undefined,
        status: "RECEIVED",
      },
    });
    return toIngestionBatch(row);
  }

  async updateIngestionBatch(
    id: string,
    data: UpdateIngestionBatchCountsData,
  ): Promise<IngestionBatch> {
    const row = await this.prisma.ingestionBatch.update({
      where: { id },
      data: {
        status: data.status,
        totalCount: data.totalCount,
        storedCount: data.storedCount,
        duplicateCount: data.duplicateCount,
        invalidCount: data.invalidCount,
        completedAt: data.completedAt,
      },
    });
    return toIngestionBatch(row);
  }

  async findIngestionBatchById(id: string): Promise<IngestionBatch | null> {
    const row = await this.prisma.ingestionBatch.findUnique({ where: { id } });
    return row ? toIngestionBatch(row) : null;
  }

  async createStagedLeads(rows: CreateStagedLeadData[]): Promise<StagedLead[]> {
    if (rows.length === 0) return [];
    const created: StagedLead[] = [];
    const chunkSize = 200;
    for (let offset = 0; offset < rows.length; offset += chunkSize) {
      const chunk = rows.slice(offset, offset + chunkSize);
      const results = await this.prisma.$transaction(
        chunk.map((row) =>
          this.prisma.stagedLead.create({
            data: {
              organizationId: row.organizationId,
              ingestionBatchId: row.ingestionBatchId ?? null,
              sourceBucketId: row.sourceBucketId,
              sourceCode: row.sourceCode,
              fullName: row.fullName,
              phone: row.phone ?? null,
              email: row.email ?? null,
              campaignNameHint: row.campaignNameHint ?? null,
              rawPayload: toJson(row.rawPayload),
              normalizedPayload: row.normalizedPayload ? toJson(row.normalizedPayload) : undefined,
              status: row.status ?? "PENDING_REVIEW",
              duplicateStatus: row.duplicateStatus ?? "UNKNOWN",
              validationStatus: row.validationStatus ?? "PENDING",
              importStatus: row.importStatus ?? "NOT_IMPORTED",
              matchReason: row.matchReason ?? null,
              matchedLeadId: row.matchedLeadId ?? null,
              matchedCustomerId: row.matchedCustomerId ?? null,
              validationErrors: row.validationErrors ? toJson(row.validationErrors) : undefined,
              tags: row.tags ? toJson(row.tags) : undefined,
              branchId: row.branchId ?? null,
              assignedManagerUserId: row.assignedManagerUserId ?? null,
              ownerManagerId: row.ownerManagerId ?? null,
              ownerTeamLeadId: row.ownerTeamLeadId ?? null,
            },
          }),
        ),
      );
      created.push(...results.map(toStagedLead));
    }
    return created;
  }

  async findStagedLeadById(id: string): Promise<StagedLead | null> {
    const row = await this.prisma.stagedLead.findUnique({ where: { id } });
    return row ? toStagedLead(row) : null;
  }

  async findStagedLeadsByIds(organizationId: string, ids: string[]): Promise<StagedLead[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.stagedLead.findMany({
      where: { organizationId, id: { in: ids } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toStagedLead);
  }

  async updateStagedLeads(
    organizationId: string,
    ids: string[],
    patch: UpdateStagedLeadPatch,
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const data: Prisma.StagedLeadUpdateManyMutationInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.duplicateStatus !== undefined) data.duplicateStatus = patch.duplicateStatus;
    if (patch.validationStatus !== undefined) data.validationStatus = patch.validationStatus;
    if (patch.importStatus !== undefined) data.importStatus = patch.importStatus;
    if (patch.matchReason !== undefined) data.matchReason = patch.matchReason;
    if (patch.matchedLeadId !== undefined) data.matchedLeadId = patch.matchedLeadId;
    if (patch.matchedCustomerId !== undefined) data.matchedCustomerId = patch.matchedCustomerId;
    if (patch.validationErrors !== undefined) {
      data.validationErrors =
        patch.validationErrors === null ? PrismaNS.DbNull : toJson(patch.validationErrors);
    }
    if (patch.tags !== undefined) data.tags = toJson(patch.tags);
    if (patch.branchId !== undefined) data.branchId = patch.branchId;
    if (patch.assignedManagerUserId !== undefined) {
      data.assignedManagerUserId = patch.assignedManagerUserId;
    }
    if (patch.ownerManagerId !== undefined) data.ownerManagerId = patch.ownerManagerId;
    if (patch.ownerTeamLeadId !== undefined) data.ownerTeamLeadId = patch.ownerTeamLeadId;
    if (patch.importedLeadId !== undefined) data.importedLeadId = patch.importedLeadId;
    if (patch.importedCampaignId !== undefined) data.importedCampaignId = patch.importedCampaignId;
    if (patch.importedAt !== undefined) data.importedAt = patch.importedAt;
    if (patch.archivedAt !== undefined) data.archivedAt = patch.archivedAt;

    const result = await this.prisma.stagedLead.updateMany({
      where: { organizationId, id: { in: ids } },
      data,
    });
    return result.count;
  }

  async listStagedLeads(
    organizationId: string,
    filter?: ListStagedLeadsFilter,
  ): Promise<StagedLead[]> {
    const rows = await this.prisma.stagedLead.findMany({
      where: this.buildStagedWhere(organizationId, filter),
      orderBy: { createdAt: "desc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toStagedLead);
  }

  async countStagedLeads(
    organizationId: string,
    filter?: ListStagedLeadsFilter,
  ): Promise<number> {
    return this.prisma.stagedLead.count({
      where: this.buildStagedWhere(organizationId, filter),
    });
  }

  async appendAudit(input: {
    organizationId: string;
    actor: LeadCenterAuditActor;
    action: string;
    targetType: string;
    targetId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    correlationId?: string | null;
  }): Promise<void> {
    await this.prisma.leadCenterAuditLog.create({
      data: {
        organizationId: input.organizationId,
        actorType: input.actor.type,
        actorId: input.actor.id ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        correlationId: input.correlationId ?? null,
        beforeState: input.beforeState ? toJson(input.beforeState) : undefined,
        afterState: input.afterState ? toJson(input.afterState) : undefined,
        recordHash: PLACEHOLDER_RECORD_HASH,
      },
    });
  }

  private buildStagedWhere(
    organizationId: string,
    filter?: ListStagedLeadsFilter,
  ): Prisma.StagedLeadWhereInput {
    const where: Prisma.StagedLeadWhereInput = { organizationId };
    if (filter?.sourceCodes && filter.sourceCodes.length > 0) {
      where.sourceCode = { in: filter.sourceCodes };
    } else if (filter?.sourceCode) {
      where.sourceCode = filter.sourceCode;
    }
    if (filter?.status) where.status = filter.status;
    if (filter?.duplicateStatus) where.duplicateStatus = filter.duplicateStatus;
    if (filter?.validationStatus) where.validationStatus = filter.validationStatus;
    if (filter?.importStatus) where.importStatus = filter.importStatus;
    if (filter?.ingestionBatchId) where.ingestionBatchId = filter.ingestionBatchId;

    // Hierarchy book OR shared intake (null/null from Meta/webhook/REST).
    if (filter?.ownerManagerId || filter?.ownerTeamLeadId) {
      const ownedBook: Prisma.StagedLeadWhereInput = {};
      if (filter.ownerManagerId) ownedBook.ownerManagerId = filter.ownerManagerId;
      if (filter.ownerTeamLeadId) ownedBook.ownerTeamLeadId = filter.ownerTeamLeadId;
      where.AND = [
        {
          OR: [{ ownerManagerId: null, ownerTeamLeadId: null }, ownedBook],
        },
      ];
    }

    if (filter?.search?.trim()) {
      const q = filter.search.trim();
      const searchOr: Prisma.StagedLeadWhereInput = {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      };
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), searchOr];
    }
    return where;
  }
}
