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

export type LeadTrendGranularity = "daily" | "weekly" | "monthly";

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
  /** Curated funnel steps (Fresh → … → Disbursed), mapped from CRM stage names. */
  conversionFunnel: NamedCount[];
  /** Lead creation volume over the selected range. */
  leadTrend: NamedCount[];
  leadTrendGranularity: LeadTrendGranularity;
  /** Assignees ranked by assigned lead volume (open + closed). */
  topPerformingUsers: NamedCount[];
  /** Campaigns ranked by lead volume. */
  topCampaigns: NamedCount[];
  /** Follow-up Completed vs Pending (open statuses). */
  followUpCompletion: NamedCount[];
  /** Won leads attributed to each source (highest conversions). */
  sourceConversions: NamedCount[];
  /** Wins recorded today (wonAt within local calendar day). */
  todayConversions: number;
  /** Conversion rate today: wins today / leads created today (0–1). */
  todayConversionRate: number;
  /** Leads created in the last 7 days. */
  weekLeadCount: number;
  /** Wins recorded in the last 7 days. */
  weekConversions: number;
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
