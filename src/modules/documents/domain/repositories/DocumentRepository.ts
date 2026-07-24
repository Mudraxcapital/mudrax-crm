// ============================================================================
// src/modules/documents/domain/repositories/DocumentRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaDocumentRepository.
//
// Document, Document Version, and the Attachment a Version pins are written
// together or not at all — a Document with no CURRENT Version, or a Version
// pointing at an Attachment that was never registered, are both states this
// module must never be able to observe. That is why the two composite write
// methods below span three tables plus the Audit Trail in one transaction
// rather than being split across three repositories.
// ============================================================================

import type { Document, DocumentOwnerType, DocumentStatus } from "../entities/Document";
import type { DocumentVersion } from "../entities/DocumentVersion";
import type {
  DocumentsAuditActor,
  DocumentsAuditRecord,
  DocumentsAuditTargetType,
} from "../entities/DocumentsAuditRecord";

/** The stored-file facts an upload contributes — produced by DocumentStoragePort.store before the transaction opens, since writing bytes is not transactional. */
export interface UploadAttachmentData {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  storageLocationId: string;
  storageKey: string;
}

export interface CreateDocumentUploadData {
  organizationId: string;
  documentTypeId: string;
  ownerType: Extract<DocumentOwnerType, "CUSTOMER" | "LEAD">;
  ownerId: string;
  createdByUserId: string;
  uploadedByUserId: string;
  attachment: UploadAttachmentData;
}

export interface AddDocumentVersionData {
  documentId: string;
  uploadedByUserId: string;
  attachment: UploadAttachmentData;
}

export interface UpdateDocumentMetadataData {
  documentTypeId?: string;
  status?: DocumentStatus;
}

export interface ListDocumentsFilter {
  ownerType?: DocumentOwnerType;
  ownerId?: string;
  documentTypeId?: string;
  status?: DocumentStatus;
  limit?: number;
  offset?: number;
}

/** What both composite write paths return: the aggregate plus the Version that is CURRENT once the transaction commits. */
export interface DocumentWithCurrentVersion {
  document: Document;
  currentVersion: DocumentVersion;
}

export interface DocumentsByCategoryEntry {
  documentCategoryId: string;
  categoryName: string;
  count: number;
}

export interface DocumentRepository {
  findById(id: string): Promise<Document | null>;
  list(organizationId: string, filter?: ListDocumentsFilter): Promise<Document[]>;
  listByOwner(ownerType: DocumentOwnerType, ownerId: string): Promise<Document[]>;
  count(organizationId: string, filter?: ListDocumentsFilter): Promise<number>;

  /**
   * The upload write path. Registers the Attachment (PROMOTED_TO_DOCUMENT,
   * since it is classified the moment it lands), creates the Document
   * (ACTIVE), pins it to Version 1 (CURRENT), and writes the
   * `DocumentUploaded` Audit Record — atomically.
   */
  createUploadWithAudit(
    data: CreateDocumentUploadData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentWithCurrentVersion>;

  /**
   * The re-upload write path. Marks the prior CURRENT Version SUPERSEDED,
   * registers the new Attachment, appends the next-numbered Version as
   * CURRENT, returns a REJECTED Document to ACTIVE (the new revision has
   * not been judged yet), and writes the `DocumentVersionCreated` Audit
   * Record — atomically. Existing Versions are never rewritten.
   */
  addVersionWithAudit(
    data: AddDocumentVersionData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentWithCurrentVersion>;

  /** Re-classifies the Document and/or moves its status, recording an "updated" Audit Record (before/after) atomically. Never touches version lineage. */
  updateMetadataWithAudit(
    id: string,
    data: UpdateDocumentMetadataData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<Document>;

  listAuditLog(
    targetType: DocumentsAuditTargetType,
    targetId: string,
  ): Promise<DocumentsAuditRecord[]>;

  // -- Version lineage -------------------------------------------------------
  findVersionById(id: string): Promise<DocumentVersion | null>;
  findCurrentVersion(documentId: string): Promise<DocumentVersion | null>;
  listVersions(documentId: string): Promise<DocumentVersion[]>;
  /** Batch form of findCurrentVersion, so list views enrich every row with its revision number in one query instead of N. */
  findCurrentVersionsByDocumentIds(documentIds: readonly string[]): Promise<DocumentVersion[]>;

  // -- Documents Dashboard aggregations --------------------------------------
  listRecent(organizationId: string, limit: number): Promise<Document[]>;
  countByCategory(organizationId: string): Promise<DocumentsByCategoryEntry[]>;
}
