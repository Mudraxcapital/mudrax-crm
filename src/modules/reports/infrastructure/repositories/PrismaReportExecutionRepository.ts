import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateReportExecutionData,
  ReportExecutionRepository,
} from "../../domain/repositories/ReportExecutionRepository";
import type { ExecutionStatus, ReportExecution } from "../../domain/entities/ReportExecution";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toReportExecution } from "../mappers/reportsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaReportExecutionRepository implements ReportExecutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ReportExecution | null> {
    const row = await this.prisma.reportExecution.findUnique({ where: { id } });
    return row ? toReportExecution(row) : null;
  }

  async list(organizationId: string, limit = 50): Promise<ReportExecution[]> {
    const rows = await this.prisma.reportExecution.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toReportExecution);
  }

  async createWithAudit(
    data: CreateReportExecutionData,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<ReportExecution> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.reportExecution.create({
        data: {
          organizationId: data.organizationId,
          savedReportId: data.savedReportId ?? null,
          scheduledReportId: data.scheduledReportId ?? null,
          reportTemplateId: data.reportTemplateId,
          triggerType: data.triggerType,
          resolvedFilter: data.resolvedFilter as unknown as Prisma.InputJsonValue,
          status: data.status ?? "QUEUED",
          startedAt: data.status === "RUNNING" ? new Date() : null,
        },
      });
      const execution = toReportExecution(row);
      await tx.reportAuditLog.create({
        data: {
          organizationId: execution.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "ReportExecutionCreated",
          targetType: "ReportExecution",
          targetId: execution.id,
          correlationId: correlationId ?? null,
          afterState: {
            id: execution.id,
            reportTemplateId: execution.reportTemplateId,
            status: execution.status,
            triggerType: execution.triggerType,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return execution;
    });
  }

  async updateStatusWithAudit(
    id: string,
    status: ExecutionStatus,
    actor: ReportsAuditActor,
    options?: {
      startedAt?: Date | null;
      completedAt?: Date | null;
      failureReason?: string | null;
      correlationId?: string | null;
    },
  ): Promise<ReportExecution> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.reportExecution.findUniqueOrThrow({ where: { id } });
      const row = await tx.reportExecution.update({
        where: { id },
        data: {
          status,
          startedAt: options?.startedAt === undefined ? undefined : options.startedAt,
          completedAt: options?.completedAt === undefined ? undefined : options.completedAt,
          failureReason: options?.failureReason === undefined ? undefined : options.failureReason,
        },
      });
      const execution = toReportExecution(row);
      await tx.reportAuditLog.create({
        data: {
          organizationId: execution.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "ReportExecutionStatusChanged",
          targetType: "ReportExecution",
          targetId: execution.id,
          correlationId: options?.correlationId ?? null,
          beforeState: { status: before.status },
          afterState: {
            status: execution.status,
            failureReason: execution.failureReason,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return execution;
    });
  }
}
