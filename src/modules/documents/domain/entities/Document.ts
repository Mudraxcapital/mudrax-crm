// ============================================================================
// src/modules/documents/domain/entities/Document.ts
//
// Aggregate Root; the business-classified, workflow-bearing wrapper built
// on one Attachment's version lineage (ADR 0007). Never hard-deleted before
// purge eligibility.
//
// The owner is polymorphic (`ownerType` + `ownerId`) and carries every
// schema value, but this reduced-scope implementation only ever *creates*
// Documents owned by a Customer or a Lead — Loan Application / Loan Account
// / Disbursement ownership arrives with those modules, and no schema or
// entity change is needed then.
// ============================================================================

export const DOCUMENT_OWNER_TYPES = [
  "CUSTOMER",
  "LEAD",
  "LOAN_APPLICATION",
  "LOAN_ACCOUNT",
  "DISBURSEMENT",
] as const;
export type DocumentOwnerType = (typeof DOCUMENT_OWNER_TYPES)[number];

/** The owner types an upload may target today — the two whose modules exist and can be referentially validated (ADR 0001: polymorphic ownerId integrity is an application-layer concern). */
export const UPLOADABLE_DOCUMENT_OWNER_TYPES = ["CUSTOMER", "LEAD"] as const;
export type UploadableDocumentOwnerType = (typeof UPLOADABLE_DOCUMENT_OWNER_TYPES)[number];

export const DOCUMENT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SUPERSEDED",
  "VERIFIED",
  "REJECTED",
  "RETAINED",
  "ARCHIVED",
  "PURGE_ELIGIBLE",
  "PURGED",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface Document {
  id: string;
  organizationId: string;
  documentTypeId: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  status: DocumentStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function isUploadableDocumentOwnerType(
  ownerType: string,
): ownerType is UploadableDocumentOwnerType {
  return (UPLOADABLE_DOCUMENT_OWNER_TYPES as readonly string[]).includes(ownerType);
}
