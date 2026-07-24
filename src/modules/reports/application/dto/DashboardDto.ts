import type { Dashboard, DashboardWidget } from "../../domain/entities/Dashboard";
import type { ReportFilter } from "../../domain/entities/ReportFilter";

export interface DashboardWidgetDto {
  id: string;
  dashboardId: string;
  visualizationType: string;
  metricDefinitionId: string | null;
  kpiId: string | null;
  reportFilter: ReportFilter;
  sortOrder: number;
  status: DashboardWidget["status"];
  kpiKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardDto {
  id: string;
  organizationId: string;
  name: string;
  audience: Dashboard["audience"];
  ownerUserId: string | null;
  status: Dashboard["status"];
  widgets: DashboardWidgetDto[];
  createdAt: string;
  updatedAt: string;
}

export function toDashboardWidgetDto(widget: DashboardWidget): DashboardWidgetDto {
  return {
    id: widget.id,
    dashboardId: widget.dashboardId,
    visualizationType: widget.visualizationType,
    metricDefinitionId: widget.metricDefinitionId,
    kpiId: widget.kpiId,
    reportFilter: widget.reportFilter,
    sortOrder: widget.sortOrder,
    status: widget.status,
    kpiKey: widget.kpiKey,
    createdAt: widget.createdAt.toISOString(),
    updatedAt: widget.updatedAt.toISOString(),
  };
}

export function toDashboardDto(dashboard: Dashboard): DashboardDto {
  return {
    id: dashboard.id,
    organizationId: dashboard.organizationId,
    name: dashboard.name,
    audience: dashboard.audience,
    ownerUserId: dashboard.ownerUserId,
    status: dashboard.status,
    widgets: dashboard.widgets.map(toDashboardWidgetDto),
    createdAt: dashboard.createdAt.toISOString(),
    updatedAt: dashboard.updatedAt.toISOString(),
  };
}
