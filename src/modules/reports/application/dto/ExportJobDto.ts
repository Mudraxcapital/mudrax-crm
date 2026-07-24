import type { ExportJob } from "../../domain/entities/ExportJob";

export interface ExportJobDto {
  id: string;
  organizationId: string;
  reportExecutionId: string | null;
  exportFormat: ExportJob["exportFormat"];
  status: ExportJob["status"];
  resultAttachmentId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  downloadPath: string | null;
}

export function toExportJobDto(job: ExportJob): ExportJobDto {
  return {
    id: job.id,
    organizationId: job.organizationId,
    reportExecutionId: job.reportExecutionId,
    exportFormat: job.exportFormat,
    status: job.status,
    resultAttachmentId: job.resultAttachmentId,
    failureReason: job.failureReason,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    downloadPath: job.status === "COMPLETED" ? `/api/reports/export/${job.id}/download` : null,
  };
}
