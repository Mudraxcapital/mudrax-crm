// ============================================================================
// src/modules/leads/application/use-cases/createLead.ts
//
// Creates a Lead against an existing Customer (leads.md: "there is no orphan
// Lead"). Defaults to the Organization's default (lowest-sortOrder, active,
// INITIAL-bucket) Lead Stage when none is supplied, and optionally records
// an initial Lead Assignment.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import type { CustomerLookupPort } from "../ports/CustomerLookupPort";
import type { UserLookupPort } from "../ports/UserLookupPort";
import {
  InvalidAssigneeReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadSourceReferenceError,
  InvalidLeadStageReferenceError,
} from "../../domain/errors/LeadErrors";
import type { CreateLeadInput } from "../validators/leadSchemas";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface CreateLeadCommand {
  organizationId: string;
  input: CreateLeadInput;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

export function makeCreateLead(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  customerLookup: CustomerLookupPort,
  userLookup: UserLookupPort,
) {
  return async function createLead(command: CreateLeadCommand): Promise<LeadDto> {
    const { organizationId, input, actor, correlationId } = command;

    const customer = await customerLookup.findById(input.customerId);
    if (!customer || customer.organizationId !== organizationId) {
      throw new InvalidCustomerReferenceError(input.customerId);
    }

    const source = await catalogRepository.findSourceById(input.leadSourceId);
    if (!source || source.organizationId !== organizationId) {
      throw new InvalidLeadSourceReferenceError(input.leadSourceId);
    }

    let stageId = input.currentStageId;
    if (stageId) {
      const stage = await catalogRepository.findStageById(stageId);
      if (!stage || stage.organizationId !== organizationId) {
        throw new InvalidLeadStageReferenceError(stageId);
      }
    } else {
      const defaultStage = await catalogRepository.findDefaultStage(organizationId);
      if (!defaultStage) {
        throw new InvalidLeadStageReferenceError("(no default Lead Stage configured)");
      }
      stageId = defaultStage.id;
    }

    if (input.currentAssigneeUserId) {
      const user = await userLookup.findById(input.currentAssigneeUserId);
      if (!user || user.organizationId !== organizationId || user.status !== "ACTIVE") {
        throw new InvalidAssigneeReferenceError(input.currentAssigneeUserId);
      }
    }

    const created = await repository.createWithAudit(
      {
        organizationId,
        customerId: input.customerId,
        leadSourceId: input.leadSourceId,
        currentStageId: stageId,
        fullNameSnapshot: input.fullNameSnapshot,
        phoneSnapshot: input.phoneSnapshot ?? null,
        emailSnapshot: input.emailSnapshot ?? null,
        initialAssignment: input.currentAssigneeUserId
          ? {
              assignedToUserId: input.currentAssigneeUserId,
              assignedByUserId: actor.actorType === "USER" ? actor.actorId : null,
              assignmentType: "INITIAL",
            }
          : null,
      },
      actor,
      correlationId,
    );

    const catalogs = await loadCatalogLookups(catalogRepository, organizationId);
    return toLeadDto(created, catalogs);
  };
}
