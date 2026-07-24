// ============================================================================
// src/modules/documents/domain/errors/DocumentErrors.ts
//
// Domain errors for the documents module's use-cases.
// ============================================================================

export class DocumentNotFoundError extends Error {
  constructor(id: string) {
    super(`Document ${id} was not found.`);
    this.name = "DocumentNotFoundError";
  }
}

export class DocumentCategoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Document Category ${id} was not found.`);
    this.name = "DocumentCategoryNotFoundError";
  }
}

export class DocumentTypeNotFoundError extends Error {
  constructor(id: string) {
    super(`Document Type ${id} was not found.`);
    this.name = "DocumentTypeNotFoundError";
  }
}

export class DuplicateDocumentCategoryNameError extends Error {
  constructor(name: string) {
    super(`A Document Category named "${name}" already exists in this Organization.`);
    this.name = "DuplicateDocumentCategoryNameError";
  }
}

export class DuplicateDocumentTypeNameError extends Error {
  constructor(name: string) {
    super(`A Document Type named "${name}" already exists in this Organization.`);
    this.name = "DuplicateDocumentTypeNameError";
  }
}

export class InvalidCustomerReferenceError extends Error {
  constructor(customerId: string) {
    super(`Customer ${customerId} was not found in this Organization.`);
    this.name = "InvalidCustomerReferenceError";
  }
}

export class InvalidLeadReferenceError extends Error {
  constructor(leadId: string) {
    super(`Lead ${leadId} was not found in this Organization.`);
    this.name = "InvalidLeadReferenceError";
  }
}

export class InvalidDocumentTypeReferenceError extends Error {
  constructor(documentTypeId: string) {
    super(`Document Type ${documentTypeId} was not found in this Organization.`);
    this.name = "InvalidDocumentTypeReferenceError";
  }
}

/** Uploads may only target the owner types whose modules exist today (ADR 0001) — see Document's UPLOADABLE_DOCUMENT_OWNER_TYPES. */
export class InvalidDocumentOwnerError extends Error {
  constructor(ownerType: string) {
    super(`A Document can only be uploaded against a CUSTOMER or a LEAD, not ${ownerType}.`);
    this.name = "InvalidDocumentOwnerError";
  }
}

/** A Document's polymorphic owner reference is only meaningful with both halves present (ADR 0007 OwnerContext). */
export class MissingDocumentOwnerError extends Error {
  constructor() {
    super("A Document must reference both an ownerType and an ownerId.");
    this.name = "MissingDocumentOwnerError";
  }
}

export class AttachmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Attachment ${id} was not found.`);
    this.name = "AttachmentNotFoundError";
  }
}

export class DocumentVersionNotFoundError extends Error {
  constructor(id: string) {
    super(`Document Version ${id} was not found.`);
    this.name = "DocumentVersionNotFoundError";
  }
}

export class DocumentVerificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Document Verification ${id} was not found.`);
    this.name = "DocumentVerificationNotFoundError";
  }
}

export class InvalidVerificationTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`A Document Verification cannot transition from ${from} to ${to}.`);
    this.name = "InvalidVerificationTransitionError";
  }
}

/** A Document Version is write-once: correcting a document means uploading a new Version, never editing an existing one (ADR 0007). */
export class DocumentVersionImmutableError extends Error {
  constructor(id: string) {
    super(
      `Document Version ${id} is immutable; upload a new version instead of modifying this one.`,
    );
    this.name = "DocumentVersionImmutableError";
  }
}

export class StorageLocationNotFoundError extends Error {
  constructor(id: string) {
    super(`Storage Location ${id} was not found.`);
    this.name = "StorageLocationNotFoundError";
  }
}
