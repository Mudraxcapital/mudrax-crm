// ============================================================================
// src/modules/users/domain/errors/UserErrors.ts
// ============================================================================

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User not found: ${id}`);
    this.name = "UserNotFoundError";
  }
}

export class DuplicateEmployeeIdError extends Error {
  constructor(employeeId: string) {
    super(`Employee ID already in use: ${employeeId}`);
    this.name = "DuplicateEmployeeIdError";
  }
}

export class DuplicateUserEmailError extends Error {
  constructor(email: string) {
    super(`Email already in use: ${email}`);
    this.name = "DuplicateUserEmailError";
  }
}

export class DuplicateUserPhoneError extends Error {
  constructor(phone: string) {
    super(`Phone number already in use: ${phone}`);
    this.name = "DuplicateUserPhoneError";
  }
}

export class InvalidUserRoleError extends Error {
  constructor(role: string) {
    super(`Invalid role "${role}". Only Admin, Manager, Team Lead, and Caller are allowed.`);
    this.name = "InvalidUserRoleError";
  }
}

export class AdminRoleProtectedError extends Error {
  constructor(message = "Managers cannot create, modify, or delete Admin accounts.") {
    super(message);
    this.name = "AdminRoleProtectedError";
  }
}

export class InvalidUserHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserHierarchyError";
  }
}

export class CannotDeleteSelfError extends Error {
  constructor() {
    super("You cannot delete your own account.");
    this.name = "CannotDeleteSelfError";
  }
}

export class LastActiveAdminError extends Error {
  constructor(
    message = "Cannot remove the last active Admin. The system requires exactly one Admin.",
  ) {
    super(message);
    this.name = "LastActiveAdminError";
  }
}

export class SingleAdminLimitError extends Error {
  constructor(
    message = "Only one Admin is allowed in the system. An Admin account already exists.",
  ) {
    super(message);
    this.name = "SingleAdminLimitError";
  }
}

export class UserDeleteBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserDeleteBlockedError";
  }
}
