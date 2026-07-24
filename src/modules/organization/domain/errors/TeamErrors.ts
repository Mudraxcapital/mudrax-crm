// ============================================================================
// src/modules/organization/domain/errors/TeamErrors.ts
//
// Domain errors for the Team aggregate's use-cases.
// ============================================================================

export class TeamNotFoundError extends Error {
  constructor(id: string) {
    super(`Team ${id} was not found.`);
    this.name = "TeamNotFoundError";
  }
}

export class DuplicateTeamCodeError extends Error {
  constructor(code: string) {
    super(`Team code "${code}" is already in use in this Organization.`);
    this.name = "DuplicateTeamCodeError";
  }
}

/** Thrown when a Team's `branchId` does not reference an existing Branch in the same Organization. */
export class InvalidBranchReferenceError extends Error {
  constructor(branchId: string) {
    super(`Branch ${branchId} was not found; a Team can only be scoped to an existing Branch.`);
    this.name = "InvalidBranchReferenceError";
  }
}
