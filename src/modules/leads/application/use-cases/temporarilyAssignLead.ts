// ============================================================================
// src/modules/leads/application/use-cases/temporarilyAssignLead.ts
//
// Temporarily reassigns a Lead to a cover caller for a fixed number of days
// (holiday coverage). Stores permanentAssigneeUserId so the Lead can revert
// automatically when temporaryAssigneeUntil elapses.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import type { UserLookupPort, UserLookupSummary } from "../ports/UserLookupPort";
import {
  InvalidAssigneeReferenceError,
  InvalidTemporaryAssignmentError,
  LeadNotFoundError,
} from "../../domain/errors/LeadErrors";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface TemporarilyAssignLeadCommand {
  id: string;
  assignedToUserId: string;
  /** Whole days of temporary cover (1–90). */
  durationDays: number;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

async function resolveAssigneeOwnership(
  userLookup: UserLookupPort,
  user: UserLookupSummary,
): Promise<{ ownerManagerId: string | null; ownerTeamLeadId: string | null } | undefined> {
  if (!user.roleName) return undefined;

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

export function makeTemporarilyAssignLead(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  userLookup: UserLookupPort,
) {
  return async function temporarilyAssignLead(
    command: TemporarilyAssignLeadCommand,
  ): Promise<LeadDto> {
    const { id, assignedToUserId, durationDays, actor, correlationId } = command;

    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 90) {
      throw new InvalidTemporaryAssignmentError(
        "Temporary assignment duration must be between 1 and 90 days.",
      );
    }

    const existing = await repository.findById(id);
    if (!existing) {
      throw new LeadNotFoundError(id);
    }

    if (!existing.currentAssigneeUserId && !existing.permanentAssigneeUserId) {
      throw new InvalidTemporaryAssignmentError(
        "Temporary assignment requires an existing permanent assignee.",
      );
    }

    const user = await userLookup.findById(assignedToUserId);
    if (!user || user.organizationId !== existing.organizationId || user.status !== "ACTIVE") {
      throw new InvalidAssigneeReferenceError(assignedToUserId);
    }

    // Keep the original permanent owner across chained temp covers.
    const permanentAssigneeUserId =
      existing.permanentAssigneeUserId ?? existing.currentAssigneeUserId!;

    if (permanentAssigneeUserId === assignedToUserId) {
      throw new InvalidTemporaryAssignmentError(
        "Temporary caller must be different from the permanent assignee.",
      );
    }

    const until = new Date();
    until.setUTCDate(until.getUTCDate() + durationDays);

    const ownership = await resolveAssigneeOwnership(userLookup, user);

    const updated = await repository.assignWithAudit(
      id,
      {
        assignedToUserId,
        assignedByUserId: actor.actorType === "USER" ? actor.actorId : null,
        assignmentType: "TEMPORARY_REASSIGNMENT",
        ownership,
        temporaryCoverage: {
          permanentAssigneeUserId,
          until,
        },
      },
      actor,
      correlationId,
    );

    const catalogs = await loadCatalogLookups(catalogRepository, updated.organizationId);
    return toLeadDto(updated, catalogs);
  };
}
