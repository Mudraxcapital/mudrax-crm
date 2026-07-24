// ============================================================================
// src/modules/follow-ups/domain/errors/FollowUpErrors.ts
//
// Domain errors for the Follow-up aggregate's use-cases.
// ============================================================================

export class FollowUpNotFoundError extends Error {
  constructor(id: string) {
    super(`Follow-up ${id} was not found.`);
    this.name = "FollowUpNotFoundError";
  }
}

export class InvalidLeadReferenceError extends Error {
  constructor(leadId: string) {
    super(`Lead ${leadId} was not found; a Follow-up must reference an existing Lead.`);
    this.name = "InvalidLeadReferenceError";
  }
}

export class InvalidAssigneeReferenceError extends Error {
  constructor(userId: string) {
    super(
      `User ${userId} was not found in this Organization; a Follow-up can only be assigned to an existing, active User.`,
    );
    this.name = "InvalidAssigneeReferenceError";
  }
}

/** Completing/updating/reassigning a Follow-up that already reached a terminal status is not supported (follow-ups.md lifecycle). */
export class FollowUpNotOpenError extends Error {
  constructor(id: string) {
    super(`Follow-up ${id} is no longer open (already Completed or Cancelled).`);
    this.name = "FollowUpNotOpenError";
  }
}
