// ============================================================================
// src/modules/telephony/domain/errors/TelephonyErrors.ts
//
// Domain errors for the telephony module's use-cases.
// ============================================================================

export class CallAttemptNotFoundError extends Error {
  constructor(id: string) {
    super(`Call Attempt ${id} was not found.`);
    this.name = "CallAttemptNotFoundError";
  }
}

/** A Call Attempt must belong to a Lead and/or a Customer (docs/modules/telephony.md). */
export class MissingCallSubjectError extends Error {
  constructor() {
    super("A Call Attempt must reference at least one of leadId or customerId.");
    this.name = "MissingCallSubjectError";
  }
}

export class InvalidLeadReferenceError extends Error {
  constructor(leadId: string) {
    super(`Lead ${leadId} was not found in this Organization.`);
    this.name = "InvalidLeadReferenceError";
  }
}

export class InvalidCustomerReferenceError extends Error {
  constructor(customerId: string) {
    super(`Customer ${customerId} was not found in this Organization.`);
    this.name = "InvalidCustomerReferenceError";
  }
}

export class InvalidAgentReferenceError extends Error {
  constructor(userId: string) {
    super(
      `User ${userId} was not found in this Organization; a Call Attempt can only be assigned to an existing, active User.`,
    );
    this.name = "InvalidAgentReferenceError";
  }
}

export class InvalidCallOutcomeReferenceError extends Error {
  constructor(callOutcomeId: string) {
    super(`Call Outcome ${callOutcomeId} was not found in this Organization.`);
    this.name = "InvalidCallOutcomeReferenceError";
  }
}

export class InvalidCallStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Call Attempt cannot transition from ${from} to ${to}.`);
    this.name = "InvalidCallStatusTransitionError";
  }
}

export class CallNoteNotFoundError extends Error {
  constructor(id: string) {
    super(`Call Note ${id} was not found.`);
    this.name = "CallNoteNotFoundError";
  }
}

export class CallOutcomeNotFoundError extends Error {
  constructor(id: string) {
    super(`Call Outcome ${id} was not found.`);
    this.name = "CallOutcomeNotFoundError";
  }
}

export class DuplicateCallOutcomeNameError extends Error {
  constructor(name: string) {
    super(`A Call Outcome named "${name}" already exists in this Organization.`);
    this.name = "DuplicateCallOutcomeNameError";
  }
}

export class AgentSessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Agent Session ${id} was not found.`);
    this.name = "AgentSessionNotFoundError";
  }
}

/** Exactly one Active Agent Session is permitted per Extension (ADR 0006). */
export class AgentSessionAlreadyActiveError extends Error {
  constructor(userId: string) {
    super(`User ${userId} already has an active Agent Session; log out first.`);
    this.name = "AgentSessionAlreadyActiveError";
  }
}

/** A Logout ends a session immutably; it is never reopened (ADR 0006). */
export class AgentSessionAlreadyEndedError extends Error {
  constructor(id: string) {
    super(`Agent Session ${id} has already been logged out and cannot be reopened.`);
    this.name = "AgentSessionAlreadyEndedError";
  }
}

export class CallRecordingNotFoundError extends Error {
  constructor(id: string) {
    super(`Call Recording ${id} was not found.`);
    this.name = "CallRecordingNotFoundError";
  }
}
