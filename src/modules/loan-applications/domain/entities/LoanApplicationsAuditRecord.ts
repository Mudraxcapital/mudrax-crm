export const LOAN_APPLICATIONS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type LoanApplicationsActorType = (typeof LOAN_APPLICATIONS_ACTOR_TYPES)[number];
export interface LoanApplicationsAuditActor {
  actorType: LoanApplicationsActorType;
  actorId: string | null;
}
export interface LoanApplicationsAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: LoanApplicationsActorType;
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
