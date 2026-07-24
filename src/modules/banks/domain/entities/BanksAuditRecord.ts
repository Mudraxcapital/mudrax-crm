export const BANKS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type BanksActorType = (typeof BANKS_ACTOR_TYPES)[number];

export interface BanksAuditActor {
  actorType: BanksActorType;
  actorId: string | null;
}

export interface BanksAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: BanksActorType;
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
