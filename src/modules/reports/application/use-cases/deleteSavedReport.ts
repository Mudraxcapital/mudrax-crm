// ============================================================================
// src/modules/reports/application/use-cases/deleteSavedReport.ts
// ============================================================================

import { SavedReportNotFoundError } from "../../domain/errors/ReportErrors";
import type { SavedReportRepository } from "../../domain/repositories/SavedReportRepository";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";

export function makeDeleteSavedReport(savedReportRepository: SavedReportRepository) {
  return async function deleteSavedReport(command: {
    organizationId: string;
    ownerUserId: string;
    savedReportId: string;
    actor: ReportsAuditActor;
  }) {
    const saved = await savedReportRepository.findById(command.savedReportId);
    if (!saved || saved.ownerUserId !== command.ownerUserId) {
      throw new SavedReportNotFoundError(command.savedReportId);
    }

    await savedReportRepository.deleteWithAudit(
      command.savedReportId,
      command.organizationId,
      command.actor,
    );
  };
}
