// ============================================================================
// src/modules/reports/domain/repositories/DashboardRepository.ts
// ============================================================================

import type {
  Dashboard,
  DashboardAudience,
  DashboardStatus,
  DashboardWidget,
} from "../entities/Dashboard";
import type { ReportFilter } from "../entities/ReportFilter";
import type { ReportsAuditActor } from "../entities/ReportsAuditRecord";

export interface CreateDashboardWidgetData {
  visualizationType: string;
  metricDefinitionId?: string | null;
  kpiId?: string | null;
  reportFilter: ReportFilter;
  sortOrder: number;
  kpiKey?: string | null;
}

export interface CreateDashboardData {
  organizationId: string;
  name: string;
  audience: DashboardAudience;
  ownerUserId?: string | null;
  widgets?: CreateDashboardWidgetData[];
}

export interface DashboardRepository {
  findById(id: string): Promise<Dashboard | null>;
  list(organizationId: string): Promise<Dashboard[]>;
  createWithAudit(
    data: CreateDashboardData,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<Dashboard>;
  updateStatusWithAudit(
    id: string,
    status: DashboardStatus,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<Dashboard>;
  listWidgets(dashboardId: string): Promise<DashboardWidget[]>;
}
