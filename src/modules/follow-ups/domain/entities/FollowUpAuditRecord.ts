// ============================================================================
// src/modules/follow-ups/domain/entities/FollowUpAuditRecord.ts
//
// One immutable, append-only fact about a change to a follow_ups module
// aggregate (FollowUp, FollowUpReassignment) — the canonical Audit Record
// shape platform-contracts.md §4 requires of every module-owned audit
// record (identical shape to organization.OrganizationAuditRecord).
// ============================================================================

export const FOLLOW_UP_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type FollowUpActorType = (typeof FOLLOW_UP_ACTOR_TYPES)[number];

export interface FollowUpAuditActor {
  actorType: FollowUpActorType;
  actorId: string | null;
}

export interface FollowUpAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: FollowUpActorType;
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
