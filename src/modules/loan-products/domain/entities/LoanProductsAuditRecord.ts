export const LOAN_PRODUCTS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type LoanProductsActorType = (typeof LOAN_PRODUCTS_ACTOR_TYPES)[number];

export interface LoanProductsAuditActor {
  actorType: LoanProductsActorType;
  actorId: string | null;
}

export interface LoanProductsAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: LoanProductsActorType;
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
