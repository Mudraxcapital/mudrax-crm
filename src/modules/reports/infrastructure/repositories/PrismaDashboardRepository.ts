import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateDashboardData,
  DashboardRepository,
} from "../../domain/repositories/DashboardRepository";
import type { Dashboard, DashboardStatus } from "../../domain/entities/Dashboard";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toDashboard, toStoredReportFilter } from "../mappers/reportsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Dashboard | null> {
    const row = await this.prisma.dashboard.findUnique({
      where: { id },
      include: { widgets: { orderBy: { sortOrder: "asc" } } },
    });
    return row ? toDashboard(row, row.widgets) : null;
  }

  async list(organizationId: string): Promise<Dashboard[]> {
    const rows = await this.prisma.dashboard.findMany({
      where: { organizationId },
      include: { widgets: { orderBy: { sortOrder: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => toDashboard(row, row.widgets));
  }

  async listWidgets(dashboardId: string) {
    const dashboard = await this.findById(dashboardId);
    return dashboard?.widgets ?? [];
  }

  async createWithAudit(
    data: CreateDashboardData,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<Dashboard> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.dashboard.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          audience: data.audience,
          ownerUserId: data.ownerUserId ?? null,
          status: "DRAFT",
          widgets: {
            create: (data.widgets ?? []).map((widget) => ({
              visualizationType: widget.visualizationType,
              metricDefinitionId: widget.metricDefinitionId ?? null,
              kpiId: widget.kpiId ?? null,
              reportFilter: toStoredReportFilter(
                widget.reportFilter,
                widget.kpiKey,
              ) as Prisma.InputJsonValue,
              sortOrder: widget.sortOrder,
              status: "ACTIVE",
            })),
          },
        },
        include: { widgets: { orderBy: { sortOrder: "asc" } } },
      });

      const dashboard = toDashboard(row, row.widgets);
      await tx.reportAuditLog.create({
        data: {
          organizationId: dashboard.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DashboardCreated",
          targetType: "Dashboard",
          targetId: dashboard.id,
          correlationId: correlationId ?? null,
          afterState: {
            id: dashboard.id,
            name: dashboard.name,
            audience: dashboard.audience,
            status: dashboard.status,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return dashboard;
    });
  }

  async updateStatusWithAudit(
    id: string,
    status: DashboardStatus,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<Dashboard> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.dashboard.findUniqueOrThrow({
        where: { id },
        include: { widgets: true },
      });
      const row = await tx.dashboard.update({
        where: { id },
        data: { status },
        include: { widgets: { orderBy: { sortOrder: "asc" } } },
      });
      const dashboard = toDashboard(row, row.widgets);
      await tx.reportAuditLog.create({
        data: {
          organizationId: dashboard.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DashboardStatusChanged",
          targetType: "Dashboard",
          targetId: dashboard.id,
          correlationId: correlationId ?? null,
          beforeState: { status: before.status },
          afterState: { status: dashboard.status },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return dashboard;
    });
  }
}
