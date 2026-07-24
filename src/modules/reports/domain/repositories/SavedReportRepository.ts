// ============================================================================
// src/modules/reports/domain/repositories/SavedReportRepository.ts
// ============================================================================

import type { ReportFilter } from "../entities/ReportFilter";
import type { SavedReport, SavedReportStatus } from "../entities/SavedReport";
import type { ReportsAuditActor } from "../entities/ReportsAuditRecord";

export interface CreateSavedReportData {
  ownerUserId: string;
  reportTemplateId: string;
  name: string;
  filterConfig: ReportFilter;
  status?: SavedReportStatus;
}

export interface SavedReportRepository {
  findById(id: string): Promise<SavedReport | null>;
  listByOwner(ownerUserId: string): Promise<SavedReport[]>;
  createWithAudit(
    data: CreateSavedReportData,
    organizationId: string,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<SavedReport>;
  archiveWithAudit(
    id: string,
    organizationId: string,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<SavedReport>;
  deleteWithAudit(
    id: string,
    organizationId: string,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<void>;
}
