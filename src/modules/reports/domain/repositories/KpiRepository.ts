// ============================================================================
// src/modules/reports/domain/repositories/KpiRepository.ts
// ============================================================================

import type { Kpi } from "../entities/Kpi";
import type { MetricDefinition } from "../entities/MetricDefinition";
import type { ReportsAuditActor } from "../entities/ReportsAuditRecord";

export interface CreateMetricDefinitionData {
  organizationId: string;
  name: string;
  domain: MetricDefinition["domain"];
  aggregationFunction: string;
  dimensions?: Record<string, unknown>;
  freshnessPolicy: MetricDefinition["freshnessPolicy"];
  status?: MetricDefinition["status"];
}

export interface CreateKpiData {
  organizationId: string;
  metricDefinitionId: string;
  name: string;
  status?: Kpi["status"];
}

export interface MetricDefinitionRepository {
  findById(id: string): Promise<MetricDefinition | null>;
  findByName(organizationId: string, name: string): Promise<MetricDefinition | null>;
  upsertWithAudit(
    data: CreateMetricDefinitionData,
    actor: ReportsAuditActor,
  ): Promise<MetricDefinition>;
}

export interface KpiRepository {
  findById(id: string): Promise<Kpi | null>;
  findByName(organizationId: string, name: string): Promise<Kpi | null>;
  list(organizationId: string): Promise<Kpi[]>;
  upsertWithAudit(data: CreateKpiData, actor: ReportsAuditActor): Promise<Kpi>;
}
