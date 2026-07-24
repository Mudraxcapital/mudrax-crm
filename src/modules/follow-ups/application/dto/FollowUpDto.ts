// ============================================================================
// src/modules/follow-ups/application/dto/FollowUpDto.ts
//
// What the Follow-up aggregate's use-cases return to the presentation
// layer — a plain, serializable shape (dates as ISO strings).
// ============================================================================

import type { FollowUp } from "../../domain/entities/FollowUp";

export interface FollowUpDto {
  id: string;
  organizationId: string;
  leadId: string;
  triggerType: FollowUp["triggerType"];
  status: FollowUp["status"];
  scheduledFor: string;
  currentAssigneeUserId: string;
  createdByUserId: string;
  completedAt: string | null;
  completedByUserId: string | null;
  outcomeNotes: string | null;
  missedAt: string | null;
  escalatedAt: string | null;
  escalatedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toFollowUpDto(followUp: FollowUp): FollowUpDto {
  return {
    id: followUp.id,
    organizationId: followUp.organizationId,
    leadId: followUp.leadId,
    triggerType: followUp.triggerType,
    status: followUp.status,
    scheduledFor: followUp.scheduledFor.toISOString(),
    currentAssigneeUserId: followUp.currentAssigneeUserId,
    createdByUserId: followUp.createdByUserId,
    completedAt: followUp.completedAt ? followUp.completedAt.toISOString() : null,
    completedByUserId: followUp.completedByUserId,
    outcomeNotes: followUp.outcomeNotes,
    missedAt: followUp.missedAt ? followUp.missedAt.toISOString() : null,
    escalatedAt: followUp.escalatedAt ? followUp.escalatedAt.toISOString() : null,
    escalatedToUserId: followUp.escalatedToUserId,
    createdAt: followUp.createdAt.toISOString(),
    updatedAt: followUp.updatedAt.toISOString(),
  };
}
