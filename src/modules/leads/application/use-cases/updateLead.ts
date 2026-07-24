// ============================================================================
// src/modules/leads/application/use-cases/updateLead.ts
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import { InvalidLeadSourceReferenceError, LeadNotFoundError } from "../../domain/errors/LeadErrors";
import type { UpdateLeadInput } from "../validators/leadSchemas";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface UpdateLeadCommand {
  id: string;
  input: UpdateLeadInput;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

export function makeUpdateLead(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
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

    const updated = await repository.updateWithAudit(
      id,
      {
        leadSourceId: input.leadSourceId,
        fullNameSnapshot: input.fullNameSnapshot,
        phoneSnapshot: input.phoneSnapshot,
        emailSnapshot: input.emailSnapshot,
      },
      actor,
      correlationId,
    );

    const catalogs = await loadCatalogLookups(catalogRepository, updated.organizationId);
    return toLeadDto(updated, catalogs);
  };
}
