// ============================================================================
// src/modules/reports/application/use-cases/createDashboard.ts
// ============================================================================

import { emptyReportFilter } from "../../domain/entities/ReportFilter";
import { KpiNotFoundError } from "../../domain/errors/ReportErrors";
import type { DashboardRepository } from "../../domain/repositories/DashboardRepository";
import type { KpiRepository } from "../../domain/repositories/KpiRepository";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { toDashboardDto } from "../dto/DashboardDto";
import { toReportFilter, type CreateDashboardInput } from "../validators/reportSchemas";

export function makeCreateDashboard(
  dashboardRepository: DashboardRepository,
  kpiRepository: KpiRepository,
) {
  return async function createDashboard(command: {
    organizationId: string;
    ownerUserId: string;
    input: CreateDashboardInput;
    actor: ReportsAuditActor;
  }) {
    const widgets = [];
    for (const [index, widget] of (command.input.widgets ?? []).entries()) {
      let kpiId = widget.kpiId ?? null;
      if (!kpiId && widget.kpiName) {
        const kpi = await kpiRepository.findByName(command.organizationId, widget.kpiName);
        kpiId = kpi?.id ?? null;
      }
      if (!kpiId) {
        throw new KpiNotFoundError(widget.kpiName ?? widget.visualizationType);
      }
      widgets.push({
        visualizationType: widget.visualizationType,
        kpiId,
        reportFilter: widget.filter ? toReportFilter(widget.filter) : emptyReportFilter(),
        sortOrder: widget.sortOrder ?? index,
        kpiKey: widget.kpiName ?? null,
      });
    }

    const dashboard = await dashboardRepository.createWithAudit(
      {
        organizationId: command.organizationId,
        name: command.input.name,
        audience: command.input.audience,
        ownerUserId: command.ownerUserId,
        widgets,
      },
      command.actor,
    );
    return toDashboardDto(dashboard);
  };
}
