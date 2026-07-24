export const LOAN_ACCOUNTS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type LoanAccountsActorType = (typeof LOAN_ACCOUNTS_ACTOR_TYPES)[number];
export interface LoanAccountsAuditActor {
  actorType: LoanAccountsActorType;
  actorId: string | null;
}
export interface LoanAccountsAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: LoanAccountsActorType;
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
