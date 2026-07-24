export const DISBURSEMENTS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type DisbursementsActorType = (typeof DISBURSEMENTS_ACTOR_TYPES)[number];
export interface DisbursementsAuditActor {
  actorType: DisbursementsActorType;
  actorId: string | null;
}
export interface DisbursementsAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: DisbursementsActorType;
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
