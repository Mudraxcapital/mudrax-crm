// ============================================================================
// src/modules/organization/domain/errors/BranchErrors.ts
//
// Domain errors for the Branch aggregate's use-cases.
// ============================================================================

export class BranchNotFoundError extends Error {
  constructor(id: string) {
    super(`Branch ${id} was not found.`);
    this.name = "BranchNotFoundError";
  }
}

export class DuplicateBranchCodeError extends Error {
  constructor(code: string) {
    super(`Branch code "${code}" is already in use in this Organization.`);
    this.name = "DuplicateBranchCodeError";
  }
}
