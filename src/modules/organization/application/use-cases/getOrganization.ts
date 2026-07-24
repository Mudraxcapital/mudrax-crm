// ============================================================================
// src/modules/organization/application/use-cases/getOrganization.ts
//
// Read-only lookups for the Organization aggregate.
// ============================================================================

import type { OrganizationRepository } from "../../domain/repositories/OrganizationRepository";
import { OrganizationNotFoundError } from "../../domain/errors/OrganizationErrors";
import { toOrganizationDto, type OrganizationDto } from "../dto/OrganizationDto";

export function makeGetOrganization(repository: OrganizationRepository) {
  return async function getOrganization(id: string): Promise<OrganizationDto> {
    const organization = await repository.findById(id);
    if (!organization) {
      throw new OrganizationNotFoundError(id);
    }
    return toOrganizationDto(organization);
  };
}

export function makeListOrganizations(repository: OrganizationRepository) {
  return async function listOrganizations(): Promise<OrganizationDto[]> {
    const organizations = await repository.list();
    return organizations.map(toOrganizationDto);
  };
}
