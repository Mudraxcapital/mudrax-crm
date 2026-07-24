// ============================================================================
// src/modules/reports/domain/repositories/ReportTemplateRepository.ts
// ============================================================================

import type { ReportTemplate, ReportTemplateColumns } from "../entities/ReportTemplate";
import type { ReportType } from "../entities/ReportType";
import type { ReportsAuditActor } from "../entities/ReportsAuditRecord";

export interface CreateReportTemplateData {
  organizationId: string | null;
  name: string;
  columns: ReportTemplateColumns;
  analyticsDatasetId?: string | null;
  defaultGrouping?: Record<string, unknown> | null;
  versionNumber?: number;
  status?: ReportTemplate["status"];
}

export interface ReportTemplateRepository {
  findById(id: string): Promise<ReportTemplate | null>;
  findPublishedByType(
    organizationId: string,
    reportType: ReportType,
  ): Promise<ReportTemplate | null>;
  list(organizationId: string): Promise<ReportTemplate[]>;
  createWithAudit(
    data: CreateReportTemplateData,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<ReportTemplate>;
}
