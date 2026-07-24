import type { ReportFilter } from "../../domain/entities/ReportFilter";
import type { SavedReport } from "../../domain/entities/SavedReport";
import type { ReportType } from "../../domain/entities/ReportType";

export interface SavedReportDto {
  id: string;
  ownerUserId: string;
  reportTemplateId: string;
  reportType: ReportType | null;
  templateName: string | null;
  name: string;
  filterConfig: ReportFilter;
  status: SavedReport["status"];
  createdAt: string;
  updatedAt: string;
}

export function toSavedReportDto(
  saved: SavedReport,
  extras?: { reportType?: ReportType | null; templateName?: string | null },
): SavedReportDto {
  return {
    id: saved.id,
    ownerUserId: saved.ownerUserId,
    reportTemplateId: saved.reportTemplateId,
    reportType: extras?.reportType ?? null,
    templateName: extras?.templateName ?? null,
    name: saved.name,
    filterConfig: saved.filterConfig,
    status: saved.status,
    createdAt: saved.createdAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
  };
}
