// ============================================================================
// src/modules/leads/application/use-cases/updateLead.ts
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadFieldDefinitionRepository } from "../../domain/repositories/LeadFieldDefinitionRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import { InvalidLeadSourceReferenceError, LeadNotFoundError } from "../../domain/errors/LeadErrors";
import { LeadFieldValidationError } from "../../domain/errors/LeadFieldErrors";
import type { UpdateLeadInput } from "../validators/leadSchemas";
import { validateLeadFieldValues } from "../validators/leadFieldSchemas";
import { partitionSystemAndCustom } from "../services/leadFieldValues";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { toLeadFieldValueDto } from "../dto/LeadFieldDefinitionDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface UpdateLeadCommand {
  id: string;
  input: UpdateLeadInput;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

function mergeFieldValues(input: UpdateLeadInput): Record<string, unknown> {
  const values: Record<string, unknown> = { ...(input.fieldValues ?? {}) };
  if (input.fullNameSnapshot != null && values.full_name == null) {
    values.full_name = input.fullNameSnapshot;
  }
  if (input.phoneSnapshot !== undefined && values.phone == null) {
    values.phone = input.phoneSnapshot;
  }
  if (input.emailSnapshot !== undefined && values.email == null) {
    values.email = input.emailSnapshot;
  }
  return values;
}

export function makeUpdateLead(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  fieldRepository: LeadFieldDefinitionRepository,
) {
  return async function updateLead(command: UpdateLeadCommand): Promise<LeadDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new LeadNotFoundError(id);
    }

    if (input.leadSourceId) {
      const source = await catalogRepository.findSourceById(input.leadSourceId);
      if (!source || source.organizationId !== existing.organizationId) {
        throw new InvalidLeadSourceReferenceError(input.leadSourceId);
      }
    }

    const fields = await fieldRepository.listActive(existing.organizationId);
    const formFields = fields.filter(
      (field) => field.isVisible && field.fieldGroup !== "HIDDEN",
    );
    const merged = mergeFieldValues(input);
    const keys = Object.keys(merged);
    const validated =
      keys.length > 0
        ? validateLeadFieldValues(formFields, merged, { onlyKeys: keys })
        : { ok: true as const, values: {} as Record<string, string | null> };

    if (!validated.ok) {
      throw new LeadFieldValidationError(validated.error);
    }

    const { systemUpdates, customValues } = partitionSystemAndCustom(fields, validated.values);

    const updated = await repository.updateWithAudit(
      id,
      {
        leadSourceId: input.leadSourceId,
        fullNameSnapshot:
          systemUpdates.fullNameSnapshot ?? input.fullNameSnapshot ?? undefined,
        phoneSnapshot:
          systemUpdates.phoneSnapshot !== undefined
            ? systemUpdates.phoneSnapshot
            : input.phoneSnapshot,
        emailSnapshot:
          systemUpdates.emailSnapshot !== undefined
            ? systemUpdates.emailSnapshot
            : input.emailSnapshot,
      },
      actor,
      correlationId,
    );

    if (customValues.length > 0) {
      await fieldRepository.upsertValuesForLead(updated.id, customValues);
    }

    const [catalogs, fieldValues] = await Promise.all([
      loadCatalogLookups(catalogRepository, updated.organizationId),
      fieldRepository.listValuesForLead(updated.id),
    ]);
    return {
      ...toLeadDto(updated, catalogs),
      fieldValues: fieldValues.map(toLeadFieldValueDto),
    };
  };
}
