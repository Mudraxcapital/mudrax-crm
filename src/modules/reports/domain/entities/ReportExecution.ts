// ============================================================================
// src/modules/reports/domain/entities/ReportExecution.ts
// ============================================================================

import type { ReportFilter } from "./ReportFilter";

export const EXECUTION_TRIGGER_TYPES = ["AD_HOC", "SCHEDULED"] as const;
export type ExecutionTriggerType = (typeof EXECUTION_TRIGGER_TYPES)[number];

export const EXECUTION_STATUSES = ["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export interface ReportExecution {
  id: string;
  organizationId: string;
  savedReportId: string | null;
  scheduledReportId: string | null;
  reportTemplateId: string;
  triggerType: ExecutionTriggerType;
  resolvedFilter: ReportFilter;
  status: ExecutionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
}
