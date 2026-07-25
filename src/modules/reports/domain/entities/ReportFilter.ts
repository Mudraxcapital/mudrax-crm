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
  /** Hierarchical Manager book — null/undefined = unrestricted (Admin). */
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  agentUserIds?: string[] | null;
}

export function emptyReportFilter(): ReportFilter {
  return {
    dateFrom: null,
    dateTo: null,
    branchId: null,
    departmentId: null,
    teamId: null,
    userId: null,
    ownerManagerId: null,
    ownerTeamLeadId: null,
    agentUserIds: null,
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
    ownerManagerId: filter.ownerManagerId ?? null,
    ownerTeamLeadId: filter.ownerTeamLeadId ?? null,
    agentUserIds: filter.agentUserIds ?? null,
  };
}
