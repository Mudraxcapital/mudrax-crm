// ============================================================================
// src/modules/leads/application/use-cases/revertTemporaryLeadAssignments.ts
//
// Reverts temporary holiday/cover assignments back to the permanent assignee.
// Used by the jobs tick (expired covers) and by Admin/Manager "end early".
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import type { UserLookupPort } from "../ports/UserLookupPort";
import { InvalidAssigneeReferenceError, LeadNotFoundError } from "../../domain/errors/LeadErrors";

export interface RevertExpiredTemporaryAssignmentsCommand {
  organizationId: string;
  asOf?: Date;
  actor?: LeadAuditActor;
  correlationId?: string | null;
}

export interface RevertTemporaryLeadAssignmentCommand {
  id: string;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

async function resolveOwnership(
  userLookup: UserLookupPort,
  userId: string,
): Promise<{ ownerManagerId: string | null; ownerTeamLeadId: string | null } | undefined> {
  const user = await userLookup.findById(userId);
  if (!user?.roleName) return undefined;

  if (user.roleName === "Caller" && !user.assignedTeamLeadId) {
    return { ownerManagerId: null, ownerTeamLeadId: null };
  }
  if (user.roleName === "Team Lead") {
    return {
      ownerManagerId: user.reportingManagerId ?? null,
      ownerTeamLeadId: user.id,
    };
  }
  if (user.roleName === "Caller" && user.assignedTeamLeadId) {
    const teamLead = await userLookup.findById(user.assignedTeamLeadId);
    return {
      ownerManagerId: teamLead?.reportingManagerId ?? null,
      ownerTeamLeadId: user.assignedTeamLeadId,
    };
  }
  if (user.roleName === "Manager") {
    return { ownerManagerId: user.id, ownerTeamLeadId: null };
  }
  if (user.roleName === "Admin") {
    return { ownerManagerId: null, ownerTeamLeadId: null };
  }
  return undefined;
}

export function makeRevertTemporaryLeadAssignment(
  repository: LeadRepository,
  userLookup: UserLookupPort,
) {
  return async function revertTemporaryLeadAssignment(
    command: RevertTemporaryLeadAssignmentCommand,
  ): Promise<{ reverted: boolean }> {
    const existing = await repository.findById(command.id);
    if (!existing) {
      throw new LeadNotFoundError(command.id);
    }
    if (!existing.permanentAssigneeUserId || !existing.temporaryAssigneeUntil) {
      return { reverted: false };
    }

    const permanentId = existing.permanentAssigneeUserId;
    const user = await userLookup.findById(permanentId);
    if (!user || user.organizationId !== existing.organizationId || user.status !== "ACTIVE") {
      throw new InvalidAssigneeReferenceError(permanentId);
    }

    const ownership = await resolveOwnership(userLookup, permanentId);

    await repository.assignWithAudit(
      command.id,
      {
        assignedToUserId: permanentId,
        assignedByUserId:
          command.actor.actorType === "USER" ? command.actor.actorId : null,
        assignmentType: "MANUAL_REASSIGNMENT",
        ownership,
        temporaryCoverage: null,
      },
      command.actor,
      command.correlationId,
    );

    return { reverted: true };
  };
}

export function makeRevertExpiredTemporaryAssignments(
  repository: LeadRepository,
  userLookup: UserLookupPort,
) {
  const revertOne = makeRevertTemporaryLeadAssignment(repository, userLookup);

  return async function revertExpiredTemporaryAssignments(
    command: RevertExpiredTemporaryAssignmentsCommand,
  ): Promise<{ revertedCount: number; failed: Array<{ leadId: string; error: string }> }> {
    const asOf = command.asOf ?? new Date();
    const actor: LeadAuditActor = command.actor ?? { actorType: "SYSTEM", actorId: null };
    const expired = await repository.listExpiredTemporaryAssignments(
      command.organizationId,
      asOf,
    );

    let revertedCount = 0;
    const failed: Array<{ leadId: string; error: string }> = [];

    for (const lead of expired) {
      try {
        const result = await revertOne({
          id: lead.id,
          actor,
          correlationId: command.correlationId,
        });
        if (result.reverted) revertedCount += 1;
      } catch (error) {
        failed.push({
          leadId: lead.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { revertedCount, failed };
  };
}
