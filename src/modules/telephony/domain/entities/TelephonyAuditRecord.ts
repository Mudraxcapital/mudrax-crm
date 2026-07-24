// ============================================================================
// src/modules/telephony/domain/entities/TelephonyAuditRecord.ts
//
// One immutable, append-only fact about a change to a telephony module
// aggregate (Call Attempt, Call Note, Call Outcome, Agent Session, Call
// Recording) — the canonical Audit Record shape platform-contracts.md §4
// requires of every module-owned audit record (identical shape to
// leads.LeadAuditRecord / customers.CustomerAuditRecord).
// ============================================================================

export const TELEPHONY_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;

export type TelephonyActorType = (typeof TELEPHONY_ACTOR_TYPES)[number];

export interface TelephonyAuditActor {
  actorType: TelephonyActorType;
  actorId: string | null;
}

export interface TelephonyAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: TelephonyActorType;
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
