// ============================================================================
// src/modules/auth/domain/errors/AuthErrors.ts
//
// Domain errors for the authentication use-case. Deliberately generic
// messages at the boundary presented to the end user — "never expose
// password hashes" and avoid turning errors into a username-enumeration
// oracle where possible.
// ============================================================================

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountNotActiveError extends Error {
  readonly status: "INACTIVE" | "SUSPENDED" | string;

  constructor(status: "INACTIVE" | "SUSPENDED" | string = "INACTIVE") {
    super(
      status === "SUSPENDED"
        ? "This account is suspended. Contact an Admin for a password reset."
        : "This account has been disabled. Contact your administrator.",
    );
    this.name = "AccountNotActiveError";
    this.status = status;
  }
}
