// ============================================================================
// src/modules/reports/domain/entities/ReportsAuditRecord.ts
// ============================================================================

export const REPORTS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type ReportsActorType = (typeof REPORTS_ACTOR_TYPES)[number];

export const REPORTS_AUDIT_TARGET_TYPES = [
  "Dashboard",
  "DashboardWidget",
  "ReportTemplate",
  "SavedReport",
  "ReportExecution",
  "ExportJob",
] as const;
export type ReportsAuditTargetType = (typeof REPORTS_AUDIT_TARGET_TYPES)[number];

export interface ReportsAuditActor {
  actorType: ReportsActorType;
  actorId: string | null;
}

export interface ReportsAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: ReportsActorType;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  recordHash: string;
  previousRecordHash: string | null;
}
