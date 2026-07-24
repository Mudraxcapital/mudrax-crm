// ============================================================================
// src/modules/reports/application/use-cases/getDashboard.ts
// ============================================================================

import { DashboardNotFoundError } from "../../domain/errors/ReportErrors";
import type { DashboardRepository } from "../../domain/repositories/DashboardRepository";
import { toDashboardDto } from "../dto/DashboardDto";

export function makeGetDashboard(dashboardRepository: DashboardRepository) {
  return async function getDashboard(organizationId: string, dashboardId: string) {
    const dashboard = await dashboardRepository.findById(dashboardId);
    if (!dashboard || dashboard.organizationId !== organizationId) {
      throw new DashboardNotFoundError(dashboardId);
    }
    return toDashboardDto(dashboard);
  };
}

export function makeListDashboards(dashboardRepository: DashboardRepository) {
  return async function listDashboards(organizationId: string) {
    const dashboards = await dashboardRepository.list(organizationId);
    return dashboards.map(toDashboardDto);
  };
}
