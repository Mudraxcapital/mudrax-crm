// ============================================================================
// src/modules/reports/domain/entities/ExportJob.ts
// ============================================================================

export const SUPPORTED_EXPORT_FORMATS = ["CSV", "PDF"] as const;
export type SupportedExportFormat = (typeof SUPPORTED_EXPORT_FORMATS)[number];

export const EXPORT_JOB_STATUSES = ["QUEUED", "RENDERING", "COMPLETED", "FAILED"] as const;
export type ExportJobStatus = (typeof EXPORT_JOB_STATUSES)[number];

export interface ExportJob {
  id: string;
  organizationId: string;
  reportExecutionId: string | null;
  analyticsDatasetId: string | null;
  exportFormat: SupportedExportFormat;
  status: ExportJobStatus;
  resultAttachmentId: string | null;
  retryOfExportJobId: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
