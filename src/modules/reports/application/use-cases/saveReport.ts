// ============================================================================
// src/modules/reports/application/use-cases/saveReport.ts
// ============================================================================

import {
  ReportTemplateNotFoundError,
  ReportTemplateNotPublishedError,
} from "../../domain/errors/ReportErrors";
import type { ReportTemplateRepository } from "../../domain/repositories/ReportTemplateRepository";
import type { SavedReportRepository } from "../../domain/repositories/SavedReportRepository";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toSavedReportDto } from "../dto/SavedReportDto";
import { toReportFilter, type SaveReportInput } from "../validators/reportSchemas";

export function makeSaveReport(
  templateRepository: ReportTemplateRepository,
  savedReportRepository: SavedReportRepository,
) {
  return async function saveReport(command: {
    organizationId: string;
    ownerUserId: string;
    input: SaveReportInput;
    actor: ReportsAuditActor;
  }) {
    const { organizationId, ownerUserId, input, actor } = command;

    const template = input.templateId
      ? await templateRepository.findById(input.templateId)
      : await templateRepository.findPublishedByType(organizationId, input.reportType);

    if (!template || (template.organizationId && template.organizationId !== organizationId)) {
      throw new ReportTemplateNotFoundError(input.templateId ?? input.reportType);
    }
    if (template.status !== "PUBLISHED") {
      throw new ReportTemplateNotPublishedError(template.id);
    }

    const saved = await savedReportRepository.createWithAudit(
      {
        ownerUserId,
        reportTemplateId: template.id,
        name: input.name,
        filterConfig: toReportFilter(input.filter),
        status: "ACTIVE",
      },
      organizationId,
      actor,
    );

    return toSavedReportDto(saved, {
      reportType: template.columns.reportType,
      templateName: template.name,
    });
  };
}
