import type { PrismaClient } from "@prisma/client";
import type {
  CreateExportJobData,
  ExportJobRepository,
} from "../../domain/repositories/ExportJobRepository";
import type { ExportJob, ExportJobStatus } from "../../domain/entities/ExportJob";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { ExportJobNotFoundError } from "../../domain/errors/ReportErrors";
import { toExportJob } from "../mappers/reportsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaExportJobRepository implements ExportJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ExportJob | null> {
    const row = await this.prisma.exportJob.findUnique({ where: { id } });
    return row ? toExportJob(row) : null;
  }

  async listByExecution(reportExecutionId: string): Promise<ExportJob[]> {
    const rows = await this.prisma.exportJob.findMany({
      where: { reportExecutionId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toExportJob).filter((job): job is ExportJob => job !== null);
  }

  async createWithAudit(
    data: CreateExportJobData,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<ExportJob> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.exportJob.create({
        data: {
          organizationId: data.organizationId,
          reportExecutionId: data.reportExecutionId,
          exportFormat: data.exportFormat,
          status: data.status ?? "QUEUED",
        },
      });
      const job = toExportJob(row);
      if (!job) throw new ExportJobNotFoundError(row.id);
      await tx.reportAuditLog.create({
        data: {
          organizationId: job.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "ExportJobCreated",
          targetType: "ExportJob",
          targetId: job.id,
          correlationId: correlationId ?? null,
          afterState: {
            id: job.id,
            exportFormat: job.exportFormat,
            status: job.status,
            reportExecutionId: job.reportExecutionId,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return job;
    });
  }

  async updateStatusWithAudit(
    id: string,
    status: ExportJobStatus,
    actor: ReportsAuditActor,
    options?: {
      failureReason?: string | null;
      resultAttachmentId?: string | null;
      correlationId?: string | null;
    },
  ): Promise<ExportJob> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.exportJob.findUniqueOrThrow({ where: { id } });
      const row = await tx.exportJob.update({
        where: { id },
        data: {
          status,
          failureReason: options?.failureReason === undefined ? undefined : options.failureReason,
          resultAttachmentId:
            options?.resultAttachmentId === undefined ? undefined : options.resultAttachmentId,
        },
      });
      const job = toExportJob(row);
      if (!job) throw new ExportJobNotFoundError(id);
      await tx.reportAuditLog.create({
        data: {
          organizationId: job.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "ExportJobStatusChanged",
          targetType: "ExportJob",
          targetId: job.id,
          correlationId: options?.correlationId ?? null,
          beforeState: { status: before.status },
          afterState: { status: job.status, failureReason: job.failureReason },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return job;
    });
  }
}
