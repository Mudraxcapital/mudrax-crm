// ============================================================================
// src/modules/follow-ups/application/use-cases/syncLeadNextAction.ts
//
// Shared helper: recomputes `leads`' denormalized "next action" projection
// for one Lead as the earliest still-open Follow-up's (scheduledFor,
// triggerType), or clears it when no open Follow-up remains
// (follow-ups.md — "maintained exclusively by a Follow-up domain-event
// listener"). Called after every create/update/complete/reassign so the
// projection can never go stale.
// ============================================================================

import type { FollowUpRepository } from "../../domain/repositories/FollowUpRepository";
import { OPEN_FOLLOW_UP_STATUSES } from "../../domain/entities/FollowUp";
import type { LeadNextActionPort } from "../ports/LeadNextActionPort";

export async function syncLeadNextAction(
  repository: FollowUpRepository,
  leadNextAction: LeadNextActionPort,
  leadId: string,
): Promise<void> {
  const followUps = await repository.listByLead(leadId);
  const open = followUps
    .filter((followUp) => OPEN_FOLLOW_UP_STATUSES.includes(followUp.status))
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

  const next = open[0];
  await leadNextAction.updateNextAction(
    leadId,
    next?.scheduledFor ?? null,
    next?.triggerType ?? null,
  );
}
