// ============================================================================
// src/modules/reports/application/use-cases/runReport.ts
// ============================================================================

import { resolveReportFilter } from "../../domain/entities/ReportFilter";
import {
  ReportTemplateNotFoundError,
  ReportTemplateNotPublishedError,
} from "../../domain/errors/ReportErrors";
import type { ReportExecutionRepository } from "../../domain/repositories/ReportExecutionRepository";
import type { ReportTemplateRepository } from "../../domain/repositories/ReportTemplateRepository";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toReportExecutionDto } from "../dto/ReportExecutionDto";
import type { SourceDataPort } from "../ports/SourceDataPort";
import { toReportFilter, type RunReportInput } from "../validators/reportSchemas";

export function makeRunReport(
  templateRepository: ReportTemplateRepository,
  executionRepository: ReportExecutionRepository,
  sourceData: SourceDataPort,
) {
  return async function runReport(command: {
    organizationId: string;
    input: RunReportInput;
    actor: ReportsAuditActor;
    savedReportId?: string | null;
  }) {
    const { organizationId, input, actor, savedReportId = null } = command;

    const template = input.templateId
      ? await templateRepository.findById(input.templateId)
      : await templateRepository.findPublishedByType(organizationId, input.reportType);

    if (!template || (template.organizationId && template.organizationId !== organizationId)) {
      throw new ReportTemplateNotFoundError(input.templateId ?? input.reportType);
    }
    if (template.status !== "PUBLISHED") {
      throw new ReportTemplateNotPublishedError(template.id);
    }

    const resolvedFilter = resolveReportFilter(toReportFilter(input.filter));
    const startedAt = new Date();

    let execution = await executionRepository.createWithAudit(
      {
        organizationId,
        savedReportId,
        reportTemplateId: template.id,
        triggerType: "AD_HOC",
        resolvedFilter,
        status: "RUNNING",
      },
      actor,
    );

    execution = await executionRepository.updateStatusWithAudit(execution.id, "RUNNING", actor, {
      startedAt,
    });

    try {
      const result = await sourceData.getReportRows(
        organizationId,
        template.columns.reportType,
        resolvedFilter,
      );
      execution = await executionRepository.updateStatusWithAudit(execution.id, "COMPLETED", actor, {
        completedAt: new Date(),
        failureReason: null,
      });
      return toReportExecutionDto(execution, {
        reportType: template.columns.reportType,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report execution failed.";
      await executionRepository.updateStatusWithAudit(execution.id, "FAILED", actor, {
        completedAt: new Date(),
        failureReason: message,
      });
      throw error;
    }
  };
}
