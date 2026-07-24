// ============================================================================
// src/modules/reports/domain/entities/MetricDefinition.ts
// ============================================================================

export const METRIC_DOMAINS = [
  "LEAD",
  "LOAN",
  "TELEPHONY",
  "DOCUMENT",
  "USER",
  "ORGANIZATION",
  "AUDIT",
] as const;
export type MetricDomain = (typeof METRIC_DOMAINS)[number];

export const FRESHNESS_POLICIES = ["REAL_TIME", "NEAR_REAL_TIME", "PERIODIC"] as const;
export type FreshnessPolicy = (typeof FRESHNESS_POLICIES)[number];

export const METRIC_DEFINITION_STATUSES = ["DRAFT", "PUBLISHED", "DEPRECATED", "RETIRED"] as const;
export type MetricDefinitionStatus = (typeof METRIC_DEFINITION_STATUSES)[number];

export interface MetricDefinition {
  id: string;
  organizationId: string;
  name: string;
  domain: MetricDomain;
  analyticsDatasetId: string | null;
  aggregationFunction: string;
  dimensions: Record<string, unknown>;
  freshnessPolicy: FreshnessPolicy;
  freshnessIntervalSeconds: number | null;
  status: MetricDefinitionStatus;
  createdAt: Date;
  updatedAt: Date;
}
