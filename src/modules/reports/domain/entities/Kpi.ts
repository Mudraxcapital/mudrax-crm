// ============================================================================
// src/modules/reports/domain/entities/Kpi.ts
// ============================================================================

export const KPI_STATUSES = ["DEFINED", "ACTIVE", "RETIRED"] as const;
export type KpiStatus = (typeof KPI_STATUSES)[number];

export interface Kpi {
  id: string;
  organizationId: string;
  metricDefinitionId: string;
  name: string;
  status: KpiStatus;
  createdAt: Date;
  updatedAt: Date;
}
