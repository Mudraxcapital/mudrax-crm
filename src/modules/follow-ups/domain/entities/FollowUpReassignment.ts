// ============================================================================
// src/modules/follow-ups/domain/entities/FollowUpReassignment.ts
//
// Auditable, append-only reassignment history (follow-ups.md — "only a Team
// Leader or Manager may reassign a Follow-up to another Caller").
// ============================================================================

export interface FollowUpReassignment {
  id: string;
  followUpId: string;
  fromUserId: string | null;
  toUserId: string;
  reassignedByUserId: string;
  reason: string | null;
  reassignedAt: Date;
}
