// ============================================================================
// src/modules/reports/domain/repositories/ReportExecutionRepository.ts
// ============================================================================

import type { ReportFilter } from "../entities/ReportFilter";
import type {
  ExecutionStatus,
  ExecutionTriggerType,
  ReportExecution,
} from "../entities/ReportExecution";
import type { ReportsAuditActor } from "../entities/ReportsAuditRecord";

export interface CreateReportExecutionData {
  organizationId: string;
  savedReportId?: string | null;
  scheduledReportId?: string | null;
  reportTemplateId: string;
  triggerType: ExecutionTriggerType;
  resolvedFilter: ReportFilter;
  status?: ExecutionStatus;
}

export interface ReportExecutionRepository {
  findById(id: string): Promise<ReportExecution | null>;
  list(organizationId: string, limit?: number): Promise<ReportExecution[]>;
  createWithAudit(
    data: CreateReportExecutionData,
    actor: ReportsAuditActor,
    correlationId?: string | null,
  ): Promise<ReportExecution>;
  updateStatusWithAudit(
    id: string,
    status: ExecutionStatus,
    actor: ReportsAuditActor,
    options?: {
      startedAt?: Date | null;
      completedAt?: Date | null;
      failureReason?: string | null;
      correlationId?: string | null;
    },
  ): Promise<ReportExecution>;
}
