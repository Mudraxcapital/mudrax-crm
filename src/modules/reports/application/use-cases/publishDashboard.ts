// ============================================================================
// src/modules/reports/application/use-cases/publishDashboard.ts
// ============================================================================

import { DashboardNotFoundError } from "../../domain/errors/ReportErrors";
import type { DashboardRepository } from "../../domain/repositories/DashboardRepository";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toDashboardDto } from "../dto/DashboardDto";

export function makePublishDashboard(dashboardRepository: DashboardRepository) {
  return async function publishDashboard(command: {
    organizationId: string;
    dashboardId: string;
    actor: ReportsAuditActor;
  }) {
    const existing = await dashboardRepository.findById(command.dashboardId);
    if (!existing || existing.organizationId !== command.organizationId) {
      throw new DashboardNotFoundError(command.dashboardId);
    }
    const dashboard = await dashboardRepository.updateStatusWithAudit(
      command.dashboardId,
      "PUBLISHED",
      command.actor,
    );
    return toDashboardDto(dashboard);
  };
}
