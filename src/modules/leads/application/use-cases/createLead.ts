// ============================================================================
// src/modules/leads/application/use-cases/createLead.ts
//
// Creates a Lead against an existing Customer (leads.md: "there is no orphan
// Lead"). Defaults to the Organization's default (lowest-sortOrder, active,
// INITIAL-bucket) Lead Stage when none is supplied, and optionally records
// an initial Lead Assignment. Dynamic field values are validated against
// Field Settings definitions.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadFieldDefinitionRepository } from "../../domain/repositories/LeadFieldDefinitionRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import type { CustomerLookupPort } from "../ports/CustomerLookupPort";
import type { UserLookupPort } from "../ports/UserLookupPort";
import {
  InvalidAssigneeReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadSourceReferenceError,
  InvalidLeadStageReferenceError,
} from "../../domain/errors/LeadErrors";
import { LeadFieldValidationError } from "../../domain/errors/LeadFieldErrors";
import type { CreateLeadInput } from "../validators/leadSchemas";
import { validateLeadFieldValues } from "../validators/leadFieldSchemas";
import { partitionSystemAndCustom } from "../services/leadFieldValues";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { toLeadFieldValueDto } from "../dto/LeadFieldDefinitionDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface CreateLeadCommand {
  organizationId: string;
  input: CreateLeadInput;
  actor: LeadAuditActor;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  campaignId?: string | null;
  correlationId?: string | null;
}

function mergeFieldValues(input: CreateLeadInput): Record<string, unknown> {
  const values: Record<string, unknown> = { ...(input.fieldValues ?? {}) };
  if (input.fullNameSnapshot && values.full_name == null) values.full_name = input.fullNameSnapshot;
  if (input.phoneSnapshot != null && values.phone == null) values.phone = input.phoneSnapshot;
  if (input.emailSnapshot != null && values.email == null) values.email = input.emailSnapshot;
  return values;
}

export function makeCreateLead(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  customerLookup: CustomerLookupPort,
  userLookup: UserLookupPort,
  fieldRepository: LeadFieldDefinitionRepository,
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

    const fields = await fieldRepository.listActive(organizationId);
    const formFields = fields.filter(
      (field) => field.isVisible && field.fieldGroup !== "HIDDEN",
    );
    const merged = mergeFieldValues(input);
    const validated = validateLeadFieldValues(formFields, merged);
    if (!validated.ok) {
      throw new LeadFieldValidationError(validated.error);
    }

    const { systemUpdates, customValues } = partitionSystemAndCustom(fields, validated.values);
    const fullName =
      systemUpdates.fullNameSnapshot?.trim() ||
      input.fullNameSnapshot?.trim() ||
      "";
    if (fullName.length < 2) {
      throw new LeadFieldValidationError("Lead Name must be at least 2 characters.");
    }

    const created = await repository.createWithAudit(
      {
        organizationId,
        customerId: input.customerId,
        leadSourceId: input.leadSourceId,
        currentStageId: stageId,
        campaignId: command.campaignId ?? null,
        ownerManagerId: command.ownerManagerId ?? null,
        ownerTeamLeadId: command.ownerTeamLeadId ?? null,
        fullNameSnapshot: fullName,
        phoneSnapshot: systemUpdates.phoneSnapshot ?? input.phoneSnapshot ?? null,
        emailSnapshot: systemUpdates.emailSnapshot ?? input.emailSnapshot ?? null,
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

    if (customValues.length > 0) {
      await fieldRepository.upsertValuesForLead(created.id, customValues);
    }

    const [catalogs, fieldValues] = await Promise.all([
      loadCatalogLookups(catalogRepository, organizationId),
      fieldRepository.listValuesForLead(created.id),
    ]);
    return {
      ...toLeadDto(created, catalogs),
      fieldValues: fieldValues.map(toLeadFieldValueDto),
    };
  };
}
