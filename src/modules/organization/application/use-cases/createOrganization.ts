// ============================================================================
// src/modules/organization/application/use-cases/createOrganization.ts
//
// Creates a new Organization row — the single canonical company/company-unit
// scope every other bounded context's `organizationId` points at
// (platform-contracts.md §5, Known Risk #9: never a hard-coded singleton,
// always a real row, so a future second legal entity/franchise is additive).
// Records an Audit Record for the creation atomically with the write
// (platform-contracts.md §4).
// ============================================================================

import type { OrganizationRepository } from "../../domain/repositories/OrganizationRepository";
import type { OrganizationAuditActor } from "../../domain/entities/OrganizationAuditRecord";
import { DuplicateOrganizationCodeError } from "../../domain/errors/OrganizationErrors";
import type { CreateOrganizationInput } from "../validators/organizationSchemas";
import { toOrganizationDto, type OrganizationDto } from "../dto/OrganizationDto";

export interface CreateOrganizationCommand {
  input: CreateOrganizationInput;
  actor: OrganizationAuditActor;
  correlationId?: string | null;
}

export function makeCreateOrganization(repository: OrganizationRepository) {
  return async function createOrganization(
    command: CreateOrganizationCommand,
  ): Promise<OrganizationDto> {
    const { input, actor, correlationId } = command;

    const existing = await repository.findByCode(input.code);
    if (existing) {
      throw new DuplicateOrganizationCodeError(input.code);
    }

    const created = await repository.createWithAudit(
      {
        name: input.name,
        code: input.code,
        status: input.status,
        timezone: input.timezone,
      },
      actor,
      correlationId,
    );

    return toOrganizationDto(created);
  };
}
