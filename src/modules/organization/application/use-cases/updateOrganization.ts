// ============================================================================
// src/modules/organization/application/use-cases/updateOrganization.ts
//
// Updates an existing Organization row. Records an Audit Record capturing
// the before/after snapshot atomically with the write
// (platform-contracts.md §4).
// ============================================================================

import type { OrganizationRepository } from "../../domain/repositories/OrganizationRepository";
import type { OrganizationAuditActor } from "../../domain/entities/OrganizationAuditRecord";
import {
  DuplicateOrganizationCodeError,
  OrganizationNotFoundError,
} from "../../domain/errors/OrganizationErrors";
import type { UpdateOrganizationInput } from "../validators/organizationSchemas";
import { toOrganizationDto, type OrganizationDto } from "../dto/OrganizationDto";

export interface UpdateOrganizationCommand {
  id: string;
  input: UpdateOrganizationInput;
  actor: OrganizationAuditActor;
  correlationId?: string | null;
}

export function makeUpdateOrganization(repository: OrganizationRepository) {
  return async function updateOrganization(
    command: UpdateOrganizationCommand,
  ): Promise<OrganizationDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new OrganizationNotFoundError(id);
    }

    if (input.code && input.code !== existing.code) {
      const codeOwner = await repository.findByCode(input.code);
      if (codeOwner && codeOwner.id !== id) {
        throw new DuplicateOrganizationCodeError(input.code);
      }
    }

    const updated = await repository.updateWithAudit(id, input, actor, correlationId);

    return toOrganizationDto(updated);
  };
}
