/**
 * Serializable Report contracts for mobile/web API clients.
 */

export type ReportType =
  | "CUSTOMER"
  | "LEAD"
  | "CAMPAIGN"
  | "TELEPHONY"
  | "DOCUMENT"
  | "NOTIFICATION";

export type SavedReportStatus = "ACTIVE" | "ARCHIVED";

/** Opaque filter bag — matches server ReportFilter JSON shape. */
export type ReportFilterConfig = Record<string, unknown>;

export interface SavedReport {
  id: string;
  ownerUserId: string;
  reportTemplateId: string;
  reportType: ReportType | null;
  templateName: string | null;
  name: string;
  filterConfig: ReportFilterConfig;
  status: SavedReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReportListResponse {
  data: SavedReport[];
}

export interface SavedReportResponse {
  data: SavedReport;
}

/** Generic report run payload from /api/reports/* endpoints. */
export interface ReportRunResult {
  reportType?: ReportType | string;
  rows?: unknown[];
  summary?: Record<string, unknown>;
  generatedAt?: string;
  [key: string]: unknown;
}

export interface ReportRunResponse {
  data: ReportRunResult;
}
