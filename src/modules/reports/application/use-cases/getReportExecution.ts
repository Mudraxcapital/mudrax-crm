// ============================================================================
// src/modules/reports/application/use-cases/getReportExecution.ts
// ============================================================================

import { ReportExecutionNotFoundError } from "../../domain/errors/ReportErrors";
import type { ReportExecutionRepository } from "../../domain/repositories/ReportExecutionRepository";
import type { ReportTemplateRepository } from "../../domain/repositories/ReportTemplateRepository";
import { toReportExecutionDto } from "../dto/ReportExecutionDto";
import type { SourceDataPort } from "../ports/SourceDataPort";

export function makeGetReportExecution(
  executionRepository: ReportExecutionRepository,
  templateRepository: ReportTemplateRepository,
  sourceData: SourceDataPort,
) {
  return async function getReportExecution(
    organizationId: string,
    executionId: string,
    options?: { includeResult?: boolean },
  ) {
    const execution = await executionRepository.findById(executionId);
    if (!execution || execution.organizationId !== organizationId) {
      throw new ReportExecutionNotFoundError(executionId);
    }

    const template = await templateRepository.findById(execution.reportTemplateId);
    const reportType = template?.columns.reportType ?? null;

    let result;
    if (options?.includeResult && execution.status === "COMPLETED" && reportType) {
      result = await sourceData.getReportRows(organizationId, reportType, execution.resolvedFilter);
    }

    return toReportExecutionDto(execution, { reportType, result });
  };
}
