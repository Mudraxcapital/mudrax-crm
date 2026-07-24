// ============================================================================
// src/modules/reports/application/use-cases/listSavedReports.ts
// ============================================================================

import type { ReportTemplateRepository } from "../../domain/repositories/ReportTemplateRepository";
import type { SavedReportRepository } from "../../domain/repositories/SavedReportRepository";
import { toSavedReportDto } from "../dto/SavedReportDto";

export function makeListSavedReports(
  savedReportRepository: SavedReportRepository,
  templateRepository: ReportTemplateRepository,
) {
  return async function listSavedReports(ownerUserId: string) {
    const savedReports = await savedReportRepository.listByOwner(ownerUserId);
    const result = [];
    for (const saved of savedReports) {
      const template = await templateRepository.findById(saved.reportTemplateId);
      result.push(
        toSavedReportDto(saved, {
          reportType: template?.columns.reportType ?? null,
          templateName: template?.name ?? null,
        }),
      );
    }
    return result;
  };
}

export function makeGetSavedReport(
  savedReportRepository: SavedReportRepository,
  templateRepository: ReportTemplateRepository,
) {
  return async function getSavedReport(ownerUserId: string, savedReportId: string) {
    const saved = await savedReportRepository.findById(savedReportId);
    if (!saved || saved.ownerUserId !== ownerUserId) return null;
    const template = await templateRepository.findById(saved.reportTemplateId);
    return toSavedReportDto(saved, {
      reportType: template?.columns.reportType ?? null,
      templateName: template?.name ?? null,
    });
  };
}
