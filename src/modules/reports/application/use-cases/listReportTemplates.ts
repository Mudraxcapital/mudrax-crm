// ============================================================================
// src/modules/reports/application/use-cases/listReportTemplates.ts
// ============================================================================

import type { ReportTemplateRepository } from "../../domain/repositories/ReportTemplateRepository";
import { toReportTemplateDto } from "../dto/ReportTemplateDto";

export function makeListReportTemplates(templateRepository: ReportTemplateRepository) {
  return async function listReportTemplates(organizationId: string) {
    const templates = await templateRepository.list(organizationId);
    return templates.map(toReportTemplateDto);
  };
}

export function makeGetReportTemplate(templateRepository: ReportTemplateRepository) {
  return async function getReportTemplate(organizationId: string, templateId: string) {
    const template = await templateRepository.findById(templateId);
    if (!template) return null;
    if (template.organizationId && template.organizationId !== organizationId) return null;
    return toReportTemplateDto(template);
  };
}
