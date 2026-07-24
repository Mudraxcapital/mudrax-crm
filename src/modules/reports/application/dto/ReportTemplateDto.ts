import type { ReportTemplate } from "../../domain/entities/ReportTemplate";
import type { ReportType } from "../../domain/entities/ReportType";

export interface ReportTemplateDto {
  id: string;
  organizationId: string | null;
  name: string;
  reportType: ReportType;
  fields: string[];
  analyticsDatasetId: string | null;
  versionNumber: number;
  status: ReportTemplate["status"];
  createdAt: string;
  updatedAt: string;
}

export function toReportTemplateDto(template: ReportTemplate): ReportTemplateDto {
  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.name,
    reportType: template.columns.reportType,
    fields: template.columns.fields,
    analyticsDatasetId: template.analyticsDatasetId,
    versionNumber: template.versionNumber,
    status: template.status,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
