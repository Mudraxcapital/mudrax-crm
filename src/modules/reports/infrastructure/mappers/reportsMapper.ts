// ============================================================================
// src/modules/reports/infrastructure/mappers/reportsMapper.ts
// ============================================================================

import type {
  Dashboard as PrismaDashboard,
  DashboardWidget as PrismaDashboardWidget,
  ExportJob as PrismaExportJob,
  Kpi as PrismaKpi,
  MetricDefinition as PrismaMetricDefinition,
  ReportAuditLog as PrismaReportAuditLog,
  ReportExecution as PrismaReportExecution,
  ReportTemplate as PrismaReportTemplate,
  SavedReport as PrismaSavedReport,
} from "@prisma/client";
import type { Dashboard, DashboardWidget } from "../../domain/entities/Dashboard";
import type { ExportJob, SupportedExportFormat } from "../../domain/entities/ExportJob";
import type { Kpi } from "../../domain/entities/Kpi";
import type { MetricDefinition } from "../../domain/entities/MetricDefinition";
import type { ReportExecution } from "../../domain/entities/ReportExecution";
import type { ReportFilter } from "../../domain/entities/ReportFilter";
import type { ReportTemplate, ReportTemplateColumns } from "../../domain/entities/ReportTemplate";
import type { ReportType } from "../../domain/entities/ReportType";
import type { ReportsAuditRecord } from "../../domain/entities/ReportsAuditRecord";
import type { SavedReport } from "../../domain/entities/SavedReport";
import { REPORT_TYPES } from "../../domain/entities/ReportType";
import { SUPPORTED_EXPORT_FORMATS } from "../../domain/entities/ExportJob";
import { emptyReportFilter } from "../../domain/entities/ReportFilter";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function toReportFilter(value: unknown): ReportFilter {
  const record = asRecord(value);
  if (!record) return emptyReportFilter();
  return {
    dateFrom: typeof record.dateFrom === "string" ? record.dateFrom : null,
    dateTo: typeof record.dateTo === "string" ? record.dateTo : null,
    branchId: typeof record.branchId === "string" ? record.branchId : null,
    departmentId: typeof record.departmentId === "string" ? record.departmentId : null,
    teamId: typeof record.teamId === "string" ? record.teamId : null,
    userId: typeof record.userId === "string" ? record.userId : null,
  };
}

function extractKpiKey(value: unknown): string | null {
  const record = asRecord(value);
  return typeof record?.kpiKey === "string" ? record.kpiKey : null;
}

export function toStoredReportFilter(filter: ReportFilter, kpiKey?: string | null) {
  return {
    ...filter,
    ...(kpiKey ? { kpiKey } : {}),
  };
}

export function toReportTemplateColumns(value: unknown): ReportTemplateColumns {
  const record = asRecord(value);
  const reportType = record?.reportType;
  const fields = Array.isArray(record?.fields)
    ? record.fields.filter((field): field is string => typeof field === "string")
    : [];
  if (typeof reportType === "string" && (REPORT_TYPES as readonly string[]).includes(reportType)) {
    return { reportType: reportType as ReportType, fields };
  }
  return { reportType: "CUSTOMER", fields };
}

export function toDashboardWidget(row: PrismaDashboardWidget): DashboardWidget {
  return {
    id: row.id,
    dashboardId: row.dashboardId,
    visualizationType: row.visualizationType,
    metricDefinitionId: row.metricDefinitionId,
    kpiId: row.kpiId,
    reportFilter: toReportFilter(row.reportFilter),
    sortOrder: row.sortOrder,
    status: row.status,
    kpiKey: extractKpiKey(row.reportFilter),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toDashboard(
  row: PrismaDashboard,
  widgets: PrismaDashboardWidget[] = [],
): Dashboard {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    audience: row.audience,
    ownerUserId: row.ownerUserId,
    status: row.status,
    widgets: widgets.map(toDashboardWidget),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toReportTemplate(row: PrismaReportTemplate): ReportTemplate {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    columns: toReportTemplateColumns(row.columns),
    analyticsDatasetId: row.analyticsDatasetId,
    defaultGrouping: asRecord(row.defaultGrouping),
    versionNumber: row.versionNumber,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toSavedReport(row: PrismaSavedReport): SavedReport {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    reportTemplateId: row.reportTemplateId,
    name: row.name,
    filterConfig: toReportFilter(row.filterConfig),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toReportExecution(row: PrismaReportExecution): ReportExecution {
  return {
    id: row.id,
    organizationId: row.organizationId,
    savedReportId: row.savedReportId,
    scheduledReportId: row.scheduledReportId,
    reportTemplateId: row.reportTemplateId,
    triggerType: row.triggerType,
    resolvedFilter: toReportFilter(row.resolvedFilter),
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
  };
}

export function toExportJob(row: PrismaExportJob): ExportJob | null {
  if (!(SUPPORTED_EXPORT_FORMATS as readonly string[]).includes(row.exportFormat)) {
    return null;
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    reportExecutionId: row.reportExecutionId,
    analyticsDatasetId: row.analyticsDatasetId,
    exportFormat: row.exportFormat as SupportedExportFormat,
    status: row.status,
    resultAttachmentId: row.resultAttachmentId,
    retryOfExportJobId: row.retryOfExportJobId,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toMetricDefinition(row: PrismaMetricDefinition): MetricDefinition {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    domain: row.domain,
    analyticsDatasetId: row.analyticsDatasetId,
    aggregationFunction: row.aggregationFunction,
    dimensions: asRecord(row.dimensions) ?? {},
    freshnessPolicy: row.freshnessPolicy,
    freshnessIntervalSeconds: row.freshnessIntervalSeconds,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toKpi(row: PrismaKpi): Kpi {
  return {
    id: row.id,
    organizationId: row.organizationId,
    metricDefinitionId: row.metricDefinitionId,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toReportsAuditRecord(row: PrismaReportAuditLog): ReportsAuditRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    occurredAt: row.occurredAt,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: asRecord(row.beforeState),
    afterState: asRecord(row.afterState),
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}
