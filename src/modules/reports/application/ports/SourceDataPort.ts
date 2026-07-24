// ============================================================================
// src/modules/reports/application/ports/SourceDataPort.ts
//
// Read-side port into upstream bounded contexts. Reports never writes into
// those modules; it only consumes curated live projections for KPIs and
// tabular report rows (ADR 0009 + task live-KPI requirement).
// ============================================================================

import type { ReportFilter } from "../../domain/entities/ReportFilter";
import type { ReportType } from "../../domain/entities/ReportType";

export interface NamedCount {
  key: string;
  label: string;
  count: number;
}

export interface AnalyticsKpis {
  totalCustomers: number;
  totalLeads: number;
  leadsByStatus: NamedCount[];
  leadsBySource: NamedCount[];
  campaignPerformance: NamedCount[];
  callsToday: number;
  connectedCalls: number;
  missedCalls: number;
  documentsUploaded: number;
  pendingDocumentVerification: number;
  notificationsSent: number;
  failedNotifications: number;
}

export interface ReportRow {
  [column: string]: string | number | boolean | null;
}

export interface ReportResult {
  reportType: ReportType;
  columns: string[];
  rows: ReportRow[];
  generatedAt: string;
}

export interface SourceDataPort {
  getAnalyticsKpis(organizationId: string, filter?: ReportFilter): Promise<AnalyticsKpis>;
  getReportRows(
    organizationId: string,
    reportType: ReportType,
    filter: ReportFilter,
  ): Promise<ReportResult>;
}
