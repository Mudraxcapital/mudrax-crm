// ============================================================================
// src/modules/reports/domain/entities/ReportTemplate.ts
// ============================================================================

import type { ReportType } from "./ReportType";

export const TEMPLATE_LIFECYCLE_STATUSES = ["DRAFT", "PUBLISHED", "DEPRECATED", "RETIRED"] as const;
export type TemplateLifecycleStatus = (typeof TEMPLATE_LIFECYCLE_STATUSES)[number];

export interface ReportTemplateColumns {
  reportType: ReportType;
  fields: string[];
}

export interface ReportTemplate {
  id: string;
  organizationId: string | null;
  name: string;
  columns: ReportTemplateColumns;
  analyticsDatasetId: string | null;
  defaultGrouping: Record<string, unknown> | null;
  versionNumber: number;
  status: TemplateLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
}
