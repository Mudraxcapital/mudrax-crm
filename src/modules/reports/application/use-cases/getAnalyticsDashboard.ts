// ============================================================================
// src/modules/reports/application/use-cases/getAnalyticsDashboard.ts
// ============================================================================

import type { ReportFilter } from "../../domain/entities/ReportFilter";
import { emptyReportFilter } from "../../domain/entities/ReportFilter";
import { toAnalyticsDashboardDto } from "../dto/AnalyticsDashboardDto";
import type { SourceDataPort } from "../ports/SourceDataPort";

export function makeGetAnalyticsDashboard(sourceData: SourceDataPort) {
  return async function getAnalyticsDashboard(
    organizationId: string,
    filter: ReportFilter = emptyReportFilter(),
  ) {
    const kpis = await sourceData.getAnalyticsKpis(organizationId, filter);
    return toAnalyticsDashboardDto(kpis);
  };
}
