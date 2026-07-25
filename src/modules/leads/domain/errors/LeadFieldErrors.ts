export class LeadFieldNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead field "${id}" was not found.`);
    this.name = "LeadFieldNotFoundError";
  }
}

export class LeadFieldKeyConflictError extends Error {
  constructor(internalKey: string) {
    super(`A lead field with key "${internalKey}" already exists.`);
    this.name = "LeadFieldKeyConflictError";
  }
}

export class LeadFieldNameConflictError extends Error {
  constructor(name: string) {
    super(`A lead field named "${name}" already exists.`);
    this.name = "LeadFieldNameConflictError";
  }
}

export class ProtectedLeadFieldError extends Error {
  constructor(internalKey: string, action: string) {
    super(`System field "${internalKey}" cannot be ${action}.`);
    this.name = "ProtectedLeadFieldError";
  }
}

export class LeadFieldValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadFieldValidationError";
  }
}
