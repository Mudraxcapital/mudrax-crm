// ============================================================================
// src/modules/reports/domain/entities/SavedReport.ts
// ============================================================================

import type { ReportFilter } from "./ReportFilter";

export const SAVED_REPORT_STATUSES = ["CREATED", "ACTIVE", "ARCHIVED"] as const;
export type SavedReportStatus = (typeof SAVED_REPORT_STATUSES)[number];

export interface SavedReport {
  id: string;
  ownerUserId: string;
  reportTemplateId: string;
  name: string;
  filterConfig: ReportFilter;
  status: SavedReportStatus;
  createdAt: Date;
  updatedAt: Date;
}
