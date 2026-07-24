// ============================================================================
// src/modules/follow-ups/application/use-cases/updateFollowUp.ts
//
// Reschedules or edits an open (not yet Completed/Cancelled) Follow-up.
// ============================================================================

import type { FollowUpRepository } from "../../domain/repositories/FollowUpRepository";
import type { FollowUpAuditActor } from "../../domain/entities/FollowUpAuditRecord";
import { OPEN_FOLLOW_UP_STATUSES } from "../../domain/entities/FollowUp";
import { FollowUpNotFoundError, FollowUpNotOpenError } from "../../domain/errors/FollowUpErrors";
import type { LeadNextActionPort } from "../ports/LeadNextActionPort";
import type { UpdateFollowUpInput } from "../validators/followUpSchemas";
import { toFollowUpDto, type FollowUpDto } from "../dto/FollowUpDto";
import { syncLeadNextAction } from "./syncLeadNextAction";

export interface UpdateFollowUpCommand {
  id: string;
  input: UpdateFollowUpInput;
  actor: FollowUpAuditActor;
  correlationId?: string | null;
}

export function makeUpdateFollowUp(
  repository: FollowUpRepository,
  leadNextAction: LeadNextActionPort,
) {
  return async function updateFollowUp(command: UpdateFollowUpCommand): Promise<FollowUpDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new FollowUpNotFoundError(id);
    }
    if (!OPEN_FOLLOW_UP_STATUSES.includes(existing.status)) {
      throw new FollowUpNotOpenError(id);
    }

    const updated = await repository.updateWithAudit(id, input, actor, correlationId);

    await syncLeadNextAction(repository, leadNextAction, updated.leadId);

    return toFollowUpDto(updated);
  };
}
