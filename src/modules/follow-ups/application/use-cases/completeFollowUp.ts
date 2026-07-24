// ============================================================================
// src/modules/follow-ups/application/use-cases/completeFollowUp.ts
//
// Marks an open Follow-up Completed with an outcome. After completion,
// recomputes the Lead's denormalized "next action" projection so it moves
// on to the next still-open Follow-up (or clears) (follow-ups.md).
// ============================================================================

import type { FollowUpRepository } from "../../domain/repositories/FollowUpRepository";
import type { FollowUpAuditActor } from "../../domain/entities/FollowUpAuditRecord";
import { OPEN_FOLLOW_UP_STATUSES } from "../../domain/entities/FollowUp";
import { FollowUpNotFoundError, FollowUpNotOpenError } from "../../domain/errors/FollowUpErrors";
import type { LeadNextActionPort } from "../ports/LeadNextActionPort";
import type { CompleteFollowUpInput } from "../validators/followUpSchemas";
import { toFollowUpDto, type FollowUpDto } from "../dto/FollowUpDto";
import { syncLeadNextAction } from "./syncLeadNextAction";

export interface CompleteFollowUpCommand {
  id: string;
  completedByUserId: string;
  input: CompleteFollowUpInput;
  actor: FollowUpAuditActor;
  correlationId?: string | null;
}

export function makeCompleteFollowUp(
  repository: FollowUpRepository,
  leadNextAction: LeadNextActionPort,
) {
  return async function completeFollowUp(command: CompleteFollowUpCommand): Promise<FollowUpDto> {
    const { id, completedByUserId, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new FollowUpNotFoundError(id);
    }
    if (!OPEN_FOLLOW_UP_STATUSES.includes(existing.status)) {
      throw new FollowUpNotOpenError(id);
    }

    const completed = await repository.completeWithAudit(
      id,
      { completedByUserId, outcomeNotes: input.outcomeNotes ?? null },
      actor,
      correlationId,
    );

    await syncLeadNextAction(repository, leadNextAction, completed.leadId);

    return toFollowUpDto(completed);
  };
}
