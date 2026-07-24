// ============================================================================
// src/modules/reports/domain/entities/ReportFilter.ts
// ============================================================================

export interface ReportFilter {
  dateFrom: string | null;
  dateTo: string | null;
  branchId: string | null;
  departmentId: string | null;
  teamId: string | null;
  userId: string | null;
}

export function emptyReportFilter(): ReportFilter {
  return {
    dateFrom: null,
    dateTo: null,
    branchId: null,
    departmentId: null,
    teamId: null,
    userId: null,
  };
}

export function resolveReportFilter(filter: ReportFilter, now: Date = new Date()): ReportFilter {
  return {
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo ?? now.toISOString(),
    branchId: filter.branchId,
    departmentId: filter.departmentId,
    teamId: filter.teamId,
    userId: filter.userId,
  };
}
