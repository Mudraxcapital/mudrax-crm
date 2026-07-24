// ============================================================================
// src/modules/auth/domain/errors/AuthErrors.ts
//
// Domain errors for the authentication use-case. Deliberately generic
// messages at the boundary presented to the end user — "never expose
// password hashes" and, more broadly, never let error detail become a
// username-enumeration or lockout-detection oracle beyond what
// platform-contracts.md §3's Password Policy already accepts (lockout
// itself is expected to be observable; *why* is not further detailed).
// ============================================================================

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountLockedError extends Error {
  constructor() {
    super("Too many failed sign-in attempts. Please try again later.");
    this.name = "AccountLockedError";
  }
}

export class AccountNotActiveError extends Error {
  constructor() {
    super("This account is not active. Contact your administrator.");
    this.name = "AccountNotActiveError";
  }
}
