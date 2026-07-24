import type { ReportFilter } from "../../domain/entities/ReportFilter";
import type { ReportExecution } from "../../domain/entities/ReportExecution";
import type { ReportType } from "../../domain/entities/ReportType";
import type { ReportResult } from "../ports/SourceDataPort";

export interface ReportExecutionDto {
  id: string;
  organizationId: string;
  savedReportId: string | null;
  reportTemplateId: string;
  reportType: ReportType | null;
  triggerType: ReportExecution["triggerType"];
  resolvedFilter: ReportFilter;
  status: ReportExecution["status"];
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  result?: ReportResult;
}

export function toReportExecutionDto(
  execution: ReportExecution,
  extras?: { reportType?: ReportType | null; result?: ReportResult },
): ReportExecutionDto {
  return {
    id: execution.id,
    organizationId: execution.organizationId,
    savedReportId: execution.savedReportId,
    reportTemplateId: execution.reportTemplateId,
    reportType: extras?.reportType ?? null,
    triggerType: execution.triggerType,
    resolvedFilter: execution.resolvedFilter,
    status: execution.status,
    startedAt: execution.startedAt?.toISOString() ?? null,
    completedAt: execution.completedAt?.toISOString() ?? null,
    failureReason: execution.failureReason,
    createdAt: execution.createdAt.toISOString(),
    result: extras?.result,
  };
}
