import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateReportTemplateData,
  ReportTemplateRepository,
} from "../../domain/repositories/ReportTemplateRepository";
import type { ReportTemplate } from "../../domain/entities/ReportTemplate";
import type { ReportType } from "../../domain/entities/ReportType";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toReportTemplate } from "../mappers/reportsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaReportTemplateRepository implements ReportTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ReportTemplate | null> {
    const row = await this.prisma.reportTemplate.findUnique({ where: { id } });
    return row ? toReportTemplate(row) : null;
  }

  async findPublishedByType(
    organizationId: string,
    reportType: ReportType,
  ): Promise<ReportTemplate | null> {
    const rows = await this.prisma.reportTemplate.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ organizationId }, { organizationId: null }],
      },
      orderBy: [{ organizationId: "desc" }, { versionNumber: "desc" }],
    });
    for (const row of rows) {
      const template = toReportTemplate(row);
      if (template.columns.reportType === reportType) return template;
    }
    return null;
  }

  async list(organizationId: string): Promise<ReportTemplate[]> {
    const rows = await this.prisma.reportTemplate.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
      },
      orderBy: { name: "asc" },
    });
    return rows.map(toReportTemplate);
  }

  async createWithAudit(
    data: CreateReportTemplateData,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<ReportTemplate> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.reportTemplate.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          columns: data.columns as unknown as Prisma.InputJsonValue,
          analyticsDatasetId: data.analyticsDatasetId ?? null,
          defaultGrouping: (data.defaultGrouping as Prisma.InputJsonValue) ?? undefined,
          versionNumber: data.versionNumber ?? 1,
          status: data.status ?? "DRAFT",
        },
      });
      const template = toReportTemplate(row);
      await tx.reportAuditLog.create({
        data: {
          organizationId: template.organizationId ?? data.organizationId ?? "",
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "ReportTemplateCreated",
          targetType: "ReportTemplate",
          targetId: template.id,
          correlationId: correlationId ?? null,
          afterState: {
            id: template.id,
            name: template.name,
            reportType: template.columns.reportType,
            status: template.status,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return template;
    });
  }
}
