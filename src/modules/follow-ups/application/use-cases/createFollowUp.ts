// ============================================================================
// src/modules/follow-ups/application/use-cases/createFollowUp.ts
//
// Schedules a Follow-up/Call Later against an existing Lead. Defaults the
// assignee to the Lead's current assignee when none is supplied. After
// creation, recomputes the Lead's denormalized "next action" projection
// (follow-ups.md).
// ============================================================================

import type { FollowUpRepository } from "../../domain/repositories/FollowUpRepository";
import type { FollowUpAuditActor } from "../../domain/entities/FollowUpAuditRecord";
import type { LeadLookupPort } from "../ports/LeadLookupPort";
import type { LeadNextActionPort } from "../ports/LeadNextActionPort";
import type { UserLookupPort } from "../ports/UserLookupPort";
import {
  InvalidAssigneeReferenceError,
  InvalidLeadReferenceError,
} from "../../domain/errors/FollowUpErrors";
import type { CreateFollowUpInput } from "../validators/followUpSchemas";
import { toFollowUpDto, type FollowUpDto } from "../dto/FollowUpDto";
import { syncLeadNextAction } from "./syncLeadNextAction";

export interface CreateFollowUpCommand {
  organizationId: string;
  input: CreateFollowUpInput;
  actor: FollowUpAuditActor;
  correlationId?: string | null;
}

export function makeCreateFollowUp(
  repository: FollowUpRepository,
  leadLookup: LeadLookupPort,
  leadNextAction: LeadNextActionPort,
  userLookup: UserLookupPort,
) {
  return async function createFollowUp(command: CreateFollowUpCommand): Promise<FollowUpDto> {
    const { organizationId, input, actor, correlationId } = command;

    const lead = await leadLookup.findById(input.leadId);
    if (!lead || lead.organizationId !== organizationId) {
      throw new InvalidLeadReferenceError(input.leadId);
    }

    const assigneeUserId = input.currentAssigneeUserId ?? lead.currentAssigneeUserId;
    if (!assigneeUserId) {
      throw new InvalidAssigneeReferenceError("(no assignee supplied and Lead has none)");
    }

    const user = await userLookup.findById(assigneeUserId);
    if (!user || user.organizationId !== organizationId || user.status !== "ACTIVE") {
      throw new InvalidAssigneeReferenceError(assigneeUserId);
    }

    const created = await repository.createWithAudit(
      {
        organizationId,
        leadId: input.leadId,
        triggerType: input.triggerType,
        scheduledFor: input.scheduledFor,
        currentAssigneeUserId: assigneeUserId,
        createdByUserId:
          actor.actorType === "USER" ? (actor.actorId ?? assigneeUserId) : assigneeUserId,
      },
      actor,
      correlationId,
    );

    await syncLeadNextAction(repository, leadNextAction, input.leadId);

    return toFollowUpDto(created);
  };
}
