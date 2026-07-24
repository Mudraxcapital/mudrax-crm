// ============================================================================
// src/modules/follow-ups/domain/entities/FollowUp.ts
//
// A scheduled callback/reminder task referencing a Lead by identity
// (follow-ups.md — "its own Aggregate Root, deliberately not a child entity
// of the Lead aggregate"). Framework-free: no Prisma types leak past the
// infrastructure/mappers layer.
// ============================================================================

export const FOLLOW_UP_TRIGGER_TYPES = ["FOLLOW_UP", "CALL_LATER"] as const;
export type FollowUpTriggerType = (typeof FOLLOW_UP_TRIGGER_TYPES)[number];

export const FOLLOW_UP_STATUSES = [
  "SCHEDULED",
  "DUE",
  "COMPLETED",
  "MISSED",
  "ESCALATED",
  "CANCELLED",
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

/** Statuses from which a Follow-up may still be completed/updated/reassigned. */
export const OPEN_FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  "SCHEDULED",
  "DUE",
  "MISSED",
  "ESCALATED",
];

export interface FollowUp {
  id: string;
  organizationId: string;
  leadId: string;
  triggerType: FollowUpTriggerType;
  status: FollowUpStatus;
  scheduledFor: Date;
  currentAssigneeUserId: string;
  createdByUserId: string;
  completedAt: Date | null;
  completedByUserId: string | null;
  outcomeNotes: string | null;
  missedAt: Date | null;
  escalatedAt: Date | null;
  escalatedToUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
