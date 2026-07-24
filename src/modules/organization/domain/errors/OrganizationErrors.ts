// ============================================================================
// src/modules/organization/domain/errors/OrganizationErrors.ts
//
// Domain errors for the Organization aggregate's use-cases.
// ============================================================================

export class OrganizationNotFoundError extends Error {
  constructor(id: string) {
    super(`Organization ${id} was not found.`);
    this.name = "OrganizationNotFoundError";
  }
}

export class DuplicateOrganizationCodeError extends Error {
  constructor(code: string) {
    super(`Organization code "${code}" is already in use.`);
    this.name = "DuplicateOrganizationCodeError";
  }
}
