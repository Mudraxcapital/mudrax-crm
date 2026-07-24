import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateSavedReportData,
  SavedReportRepository,
} from "../../domain/repositories/SavedReportRepository";
import type { SavedReport } from "../../domain/entities/SavedReport";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toSavedReport } from "../mappers/reportsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaSavedReportRepository implements SavedReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<SavedReport | null> {
    const row = await this.prisma.savedReport.findUnique({ where: { id } });
    return row ? toSavedReport(row) : null;
  }

  async listByOwner(ownerUserId: string): Promise<SavedReport[]> {
    const rows = await this.prisma.savedReport.findMany({
      where: { ownerUserId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toSavedReport);
  }

  async createWithAudit(
    data: CreateSavedReportData,
    organizationId: string,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<SavedReport> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.savedReport.create({
        data: {
          ownerUserId: data.ownerUserId,
          reportTemplateId: data.reportTemplateId,
          name: data.name,
          filterConfig: data.filterConfig as unknown as Prisma.InputJsonValue,
          status: data.status ?? "ACTIVE",
        },
      });
      const saved = toSavedReport(row);
      await tx.reportAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "SavedReportCreated",
          targetType: "SavedReport",
          targetId: saved.id,
          correlationId: correlationId ?? null,
          afterState: {
            id: saved.id,
            name: saved.name,
            reportTemplateId: saved.reportTemplateId,
            status: saved.status,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return saved;
    });
  }

  async archiveWithAudit(
    id: string,
    organizationId: string,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<SavedReport> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.savedReport.findUniqueOrThrow({ where: { id } });
      const row = await tx.savedReport.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
      const saved = toSavedReport(row);
      await tx.reportAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "SavedReportArchived",
          targetType: "SavedReport",
          targetId: saved.id,
          correlationId: correlationId ?? null,
          beforeState: { status: before.status },
          afterState: { status: saved.status },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return saved;
    });
  }

  async deleteWithAudit(
    id: string,
    organizationId: string,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.savedReport.findUniqueOrThrow({ where: { id } });
      await tx.savedReport.delete({ where: { id } });
      await tx.reportAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "SavedReportDeleted",
          targetType: "SavedReport",
          targetId: id,
          correlationId: correlationId ?? null,
          beforeState: {
            id: before.id,
            name: before.name,
            reportTemplateId: before.reportTemplateId,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
    });
  }
}
