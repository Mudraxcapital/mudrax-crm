// ============================================================================
// src/modules/leads/domain/errors/LeadErrors.ts
//
// Domain errors for the Lead aggregate's use-cases.
// ============================================================================

export class LeadNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead ${id} was not found.`);
    this.name = "LeadNotFoundError";
  }
}

export class InvalidCustomerReferenceError extends Error {
  constructor(customerId: string) {
    super(`Customer ${customerId} was not found; a Lead must belong to an existing Customer.`);
    this.name = "InvalidCustomerReferenceError";
  }
}

export class InvalidLeadSourceReferenceError extends Error {
  constructor(leadSourceId: string) {
    super(`Lead Source ${leadSourceId} was not found in this Organization.`);
    this.name = "InvalidLeadSourceReferenceError";
  }
}

export class InvalidLeadStageReferenceError extends Error {
  constructor(leadStageId: string) {
    super(`Lead Stage ${leadStageId} was not found in this Organization.`);
    this.name = "InvalidLeadStageReferenceError";
  }
}

export class InvalidLostReasonReferenceError extends Error {
  constructor(lostReasonId: string) {
    super(`Lost Reason ${lostReasonId} was not found in this Organization.`);
    this.name = "InvalidLostReasonReferenceError";
  }
}

/** Thrown when a Lead is moved into a Closed-Lost Stage without a Lost Reason (leads.md). */
export class LostReasonRequiredError extends Error {
  constructor() {
    super("A Lost Reason is required when moving a Lead into a Closed-Lost stage.");
    this.name = "LostReasonRequiredError";
  }
}

/** Reopening a closed Lead is not supported (leads.md). */
export class LeadAlreadyClosedError extends Error {
  constructor(id: string) {
    super(`Lead ${id} is already Closed and cannot be reopened or moved to another stage.`);
    this.name = "LeadAlreadyClosedError";
  }
}

export class InvalidAssigneeReferenceError extends Error {
  constructor(userId: string) {
    super(
      `User ${userId} was not found in this Organization; a Lead can only be assigned to an existing, active User.`,
    );
    this.name = "InvalidAssigneeReferenceError";
  }
}

export class LeadNoteNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead Note ${id} was not found.`);
    this.name = "LeadNoteNotFoundError";
  }
}

export class SavedViewNotFoundError extends Error {
  constructor(id: string) {
    super(`Saved View ${id} was not found.`);
    this.name = "SavedViewNotFoundError";
  }
}

export class ImportBatchNotFoundError extends Error {
  constructor(id: string) {
    super(`Import Batch ${id} was not found.`);
    this.name = "ImportBatchNotFoundError";
  }
}

export class LeadMergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadMergeError";
  }
}

export class BulkOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BulkOperationError";
  }
}

/** Thrown when a Lead/Customer cannot be hard-deleted due to dependent loan records. */
export class LeadHardDeleteBlockedError extends Error {
  constructor(leadId: string, reason: string) {
    super(`Lead ${leadId} cannot be permanently deleted: ${reason}`);
    this.name = "LeadHardDeleteBlockedError";
  }
}
