// ============================================================================
// src/modules/leads/domain/entities/Lead.ts
//
// Inbound sales inquiry; belongs to exactly one Customer from the moment it
// is created (leads.md, ADR 0004). Framework-free: no Prisma types leak past
// the infrastructure/mappers layer.
// ============================================================================

export interface Lead {
  id: string;
  organizationId: string;
  customerId: string;
  leadSourceId: string;
  currentStageId: string;
  lostReasonId: string | null;
  campaignId: string | null;
  currentAssigneeUserId: string | null;
  /** Original assignee while a temporary cover is active. */
  permanentAssigneeUserId: string | null;
  /** When the temporary cover expires (null = not temporary). */
  temporaryAssigneeUntil: Date | null;
  ownerManagerId: string | null;
  ownerTeamLeadId: string | null;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  emailSnapshot: string | null;
  /** Denormalized "next action" projection — written exclusively by the follow-ups module (leads.md). No other code path may write these two fields. */
  nextActionAt: Date | null;
  nextActionType: string | null;
  wonAt: Date | null;
  lostAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
