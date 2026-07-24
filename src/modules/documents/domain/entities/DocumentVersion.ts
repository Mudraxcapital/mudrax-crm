// ============================================================================
// src/modules/documents/domain/entities/DocumentVersion.ts
//
// Child entity of Document; one immutable file revision (ADR 0007). File
// bytes are always an external Storage Reference, never inlined.
//
// Immutability rule enforced by this module: a Version's content binding
// (`attachmentId`, `storageLocationId`, `versionNumber`) is write-once —
// correcting a document means uploading a *new* Version, which supersedes
// the current one. Only the lifecycle `status` advances after creation, and
// only along the transitions below. At most one CURRENT Version may exist
// per Document (a partial unique index in the schema backs this).
// ============================================================================

export const DOCUMENT_VERSION_STATUSES = [
  "UPLOADED",
  "CURRENT",
  "SUPERSEDED",
  "ARCHIVED",
  "PURGED",
] as const;
export type DocumentVersionStatus = (typeof DOCUMENT_VERSION_STATUSES)[number];

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  attachmentId: string;
  storageLocationId: string;
  status: DocumentVersionStatus;
  uploadedByUserId: string;
  createdAt: Date;
}

/** The only fields a Version may ever change after creation — everything else is write-once. */
const ALLOWED_VERSION_STATUS_TRANSITIONS: Record<DocumentVersionStatus, DocumentVersionStatus[]> = {
  UPLOADED: ["CURRENT", "SUPERSEDED", "ARCHIVED"],
  CURRENT: ["SUPERSEDED", "ARCHIVED"],
  SUPERSEDED: ["ARCHIVED", "PURGED"],
  ARCHIVED: ["PURGED"],
  PURGED: [],
};

export function canTransitionDocumentVersionStatus(
  from: DocumentVersionStatus,
  to: DocumentVersionStatus,
): boolean {
  if (from === to) return false;
  return ALLOWED_VERSION_STATUS_TRANSITIONS[from].includes(to);
}

export function isCurrentDocumentVersion(version: DocumentVersion): boolean {
  return version.status === "CURRENT";
}

/** A Version may only be superseded while it is the Document's CURRENT revision; superseding anything else would break the single-CURRENT invariant. */
export function canSupersedeDocumentVersion(version: DocumentVersion): boolean {
  return canTransitionDocumentVersionStatus(version.status, "SUPERSEDED");
}

/** The next revision number in a Document's lineage. Versions are numbered from 1 and never reused. */
export function nextVersionNumber(versions: readonly DocumentVersion[]): number {
  return versions.reduce((highest, version) => Math.max(highest, version.versionNumber), 0) + 1;
}
