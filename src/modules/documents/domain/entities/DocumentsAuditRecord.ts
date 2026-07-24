// ============================================================================
// src/modules/documents/domain/entities/DocumentsAuditRecord.ts
//
// One immutable, append-only fact about a change to a documents module
// aggregate (Document Category, Document Type, Attachment, Document,
// Document Version, Document Verification) — the canonical Audit Record
// shape platform-contracts.md §4 requires of every module-owned audit
// record (identical shape to telephony.TelephonyAuditRecord /
// leads.LeadAuditRecord).
//
// Backed by documents.AuditTrail, which is structurally append-only: no
// update/delete use-case is exposed at the domain layer, and UPDATE/DELETE
// are revoked at the database level.
// ============================================================================

export const DOCUMENTS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;

export type DocumentsActorType = (typeof DOCUMENTS_ACTOR_TYPES)[number];

/** The aggregates this module writes audit records against — the `targetType` discriminator of documents.AuditTrail. */
export const DOCUMENTS_AUDIT_TARGET_TYPES = [
  "DocumentCategory",
  "DocumentType",
  "Attachment",
  "Document",
  "DocumentVersion",
  "DocumentVerification",
] as const;

export type DocumentsAuditTargetType = (typeof DOCUMENTS_AUDIT_TARGET_TYPES)[number];

export interface DocumentsAuditActor {
  actorType: DocumentsActorType;
  actorId: string | null;
}

export interface DocumentsAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: DocumentsActorType;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  recordHash: string;
  previousRecordHash: string | null;
}
