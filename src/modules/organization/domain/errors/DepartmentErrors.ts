// ============================================================================
// src/modules/organization/domain/errors/DepartmentErrors.ts
//
// Domain errors for the Department aggregate's use-cases.
// ============================================================================

export class DepartmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Department ${id} was not found.`);
    this.name = "DepartmentNotFoundError";
  }
}

export class DuplicateDepartmentCodeError extends Error {
  constructor(code: string) {
    super(`Department code "${code}" is already in use in this Organization.`);
    this.name = "DuplicateDepartmentCodeError";
  }
}
