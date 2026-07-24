// ============================================================================
// src/modules/reports/application/use-cases/rerunSavedReport.ts
// ============================================================================

import { SavedReportNotFoundError } from "../../domain/errors/ReportErrors";
import type { ReportTemplateRepository } from "../../domain/repositories/ReportTemplateRepository";
import type { SavedReportRepository } from "../../domain/repositories/SavedReportRepository";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import type { makeRunReport } from "./runReport";

export function makeRerunSavedReport(
  savedReportRepository: SavedReportRepository,
  templateRepository: ReportTemplateRepository,
  runReport: ReturnType<typeof makeRunReport>,
) {
  return async function rerunSavedReport(command: {
    organizationId: string;
    ownerUserId: string;
    savedReportId: string;
    actor: ReportsAuditActor;
  }) {
    const saved = await savedReportRepository.findById(command.savedReportId);
    if (!saved || saved.ownerUserId !== command.ownerUserId || saved.status === "ARCHIVED") {
      throw new SavedReportNotFoundError(command.savedReportId);
    }

    const template = await templateRepository.findById(saved.reportTemplateId);
    if (!template) {
      throw new SavedReportNotFoundError(command.savedReportId);
    }

    return runReport({
      organizationId: command.organizationId,
      input: {
        reportType: template.columns.reportType,
        templateId: template.id,
        filter: saved.filterConfig,
      },
      actor: command.actor,
      savedReportId: saved.id,
    });
  };
}
