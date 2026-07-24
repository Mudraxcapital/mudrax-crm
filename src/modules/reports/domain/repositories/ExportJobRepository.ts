// ============================================================================
// src/modules/reports/domain/repositories/ExportJobRepository.ts
// ============================================================================

import type { ExportJob, ExportJobStatus, SupportedExportFormat } from "../entities/ExportJob";
import type { ReportsAuditActor } from "../entities/ReportsAuditRecord";

export interface CreateExportJobData {
  organizationId: string;
  reportExecutionId: string;
  exportFormat: SupportedExportFormat;
  status?: ExportJobStatus;
}

export interface ExportJobRepository {
  findById(id: string): Promise<ExportJob | null>;
  listByExecution(reportExecutionId: string): Promise<ExportJob[]>;
  createWithAudit(
    data: CreateExportJobData,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<ExportJob>;
  updateStatusWithAudit(
    id: string,
    status: ExportJobStatus,
    actor: ReportsAuditActor,
    options?: {
      failureReason?: string | null;
      resultAttachmentId?: string | null;
      correlationId?: string | null;
    },
  ): Promise<ExportJob>;
}
