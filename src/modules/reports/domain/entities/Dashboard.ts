// ============================================================================
// src/modules/reports/domain/entities/Dashboard.ts
// ============================================================================

import type { ReportFilter } from "./ReportFilter";

export const DASHBOARD_AUDIENCES = ["EXECUTIVE", "BRANCH", "TEAM", "PERSONAL"] as const;
export type DashboardAudience = (typeof DASHBOARD_AUDIENCES)[number];

export const DASHBOARD_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type DashboardStatus = (typeof DASHBOARD_STATUSES)[number];

export const WIDGET_STATUSES = ["ADDED", "CONFIGURED", "ACTIVE", "REMOVED"] as const;
export type WidgetStatus = (typeof WIDGET_STATUSES)[number];

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  visualizationType: string;
  metricDefinitionId: string | null;
  kpiId: string | null;
  reportFilter: ReportFilter;
  sortOrder: number;
  status: WidgetStatus;
  /** Optional live-KPI key resolved by the Analytics Dashboard projection. */
  kpiKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dashboard {
  id: string;
  organizationId: string;
  name: string;
  audience: DashboardAudience;
  ownerUserId: string | null;
  status: DashboardStatus;
  widgets: DashboardWidget[];
  createdAt: Date;
  updatedAt: Date;
}
