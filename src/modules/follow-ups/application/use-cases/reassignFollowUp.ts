// ============================================================================
// src/modules/follow-ups/application/use-cases/reassignFollowUp.ts
//
// Reassigns an open Follow-up to another Caller (follow-ups.md — "only a
// Team Leader or Manager may reassign"; enforced at the presentation layer
// via the `follow_up.reassign` Permission).
// ============================================================================

import type { FollowUpRepository } from "../../domain/repositories/FollowUpRepository";
import type { FollowUpAuditActor } from "../../domain/entities/FollowUpAuditRecord";
import { OPEN_FOLLOW_UP_STATUSES } from "../../domain/entities/FollowUp";
import {
  FollowUpNotFoundError,
  FollowUpNotOpenError,
  InvalidAssigneeReferenceError,
} from "../../domain/errors/FollowUpErrors";
import type { UserLookupPort } from "../ports/UserLookupPort";
import type { ReassignFollowUpInput } from "../validators/followUpSchemas";
import { toFollowUpDto, type FollowUpDto } from "../dto/FollowUpDto";

export interface ReassignFollowUpCommand {
  id: string;
  input: ReassignFollowUpInput;
  actor: FollowUpAuditActor;
  correlationId?: string | null;
}

export function makeReassignFollowUp(repository: FollowUpRepository, userLookup: UserLookupPort) {
  return async function reassignFollowUp(command: ReassignFollowUpCommand): Promise<FollowUpDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new FollowUpNotFoundError(id);
    }
    if (!OPEN_FOLLOW_UP_STATUSES.includes(existing.status)) {
      throw new FollowUpNotOpenError(id);
    }

    const user = await userLookup.findById(input.toUserId);
    if (!user || user.organizationId !== existing.organizationId || user.status !== "ACTIVE") {
      throw new InvalidAssigneeReferenceError(input.toUserId);
    }

    const updated = await repository.reassignWithAudit(
      id,
      {
        toUserId: input.toUserId,
        reassignedByUserId:
          actor.actorType === "USER" ? (actor.actorId ?? input.toUserId) : input.toUserId,
        reason: input.reason ?? null,
      },
      actor,
      correlationId,
    );

    return toFollowUpDto(updated);
  };
}
