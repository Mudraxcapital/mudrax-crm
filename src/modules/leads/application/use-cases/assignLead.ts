// ============================================================================
// src/modules/leads/application/use-cases/assignLead.ts
//
// Assigns or reassigns a Lead's current owner (leads.md: "leads is the sole
// owner and sole writer of Lead Assignment"). `campaigns` may initiate this
// through this same use-case (campaignAssignmentId set) — it never writes
// Lead state directly (ADR 0004).
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import type { AssignmentType } from "../../domain/entities/LeadAssignment";
import type { UserLookupPort } from "../ports/UserLookupPort";
import { InvalidAssigneeReferenceError, LeadNotFoundError } from "../../domain/errors/LeadErrors";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { AssignLeadInput } from "../validators/leadSchemas";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface AssignLeadCommand {
  id: string;
  input: AssignLeadInput;
  actor: LeadAuditActor;
  correlationId?: string | null;
  /** Set by `campaigns` when this assignment originates from a Campaign Assignment allocation decision (ADR 0004). */
  campaignAssignmentId?: string | null;
}

export function makeAssignLead(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  userLookup: UserLookupPort,
) {
  return async function assignLead(command: AssignLeadCommand): Promise<LeadDto> {
    const { id, input, actor, correlationId, campaignAssignmentId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new LeadNotFoundError(id);
    }

    const user = await userLookup.findById(input.assignedToUserId);
    if (!user || user.organizationId !== existing.organizationId || user.status !== "ACTIVE") {
      throw new InvalidAssigneeReferenceError(input.assignedToUserId);
    }

    const assignmentType: AssignmentType = campaignAssignmentId
      ? "CAMPAIGN_ALLOCATION"
      : existing.currentAssigneeUserId
        ? "MANUAL_REASSIGNMENT"
        : "INITIAL";

    const updated = await repository.assignWithAudit(
      id,
      {
        assignedToUserId: input.assignedToUserId,
        assignedByUserId: actor.actorType === "USER" ? actor.actorId : null,
        assignmentType,
        campaignAssignmentId: campaignAssignmentId ?? null,
      },
      actor,
      correlationId,
    );

    const catalogs = await loadCatalogLookups(catalogRepository, updated.organizationId);
    return toLeadDto(updated, catalogs);
  };
}
