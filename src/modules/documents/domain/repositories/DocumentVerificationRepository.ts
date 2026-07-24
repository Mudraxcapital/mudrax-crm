// ============================================================================
// src/modules/documents/domain/repositories/DocumentVerificationRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaDocumentVerificationRepository.
//
// A Verification is an independent Aggregate Root pinned to one Document
// Version (ADR 0007), so it lives in its own repository rather than hanging
// off DocumentRepository — even though updating one also syncs the parent
// Document's status.
// ============================================================================

import type {
  DocumentVerification,
  VerificationMethod,
  VerificationStatus,
} from "../entities/DocumentVerification";
import type { DocumentsAuditActor } from "../entities/DocumentsAuditRecord";

export interface CreateDocumentVerificationData {
  organizationId: string;
  documentVersionId: string;
  method: VerificationMethod;
}

export interface UpdateVerificationStatusData {
  status: VerificationStatus;
  verifiedByUserId?: string | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;
}

export interface ListDocumentVerificationsFilter {
  status?: VerificationStatus;
  limit?: number;
  offset?: number;
}

export interface DocumentVerificationRepository {
  findById(id: string): Promise<DocumentVerification | null>;

  /** The open (or most recently decided) cycle for a pinned Version — the one a reviewer acts on. */
  findLatestByDocumentVersionId(documentVersionId: string): Promise<DocumentVerification | null>;

  /** Batch form of findLatestByDocumentVersionId, so list views resolve every row's verification state in one query instead of N. */
  findLatestByDocumentVersionIds(
    documentVersionIds: readonly string[],
  ): Promise<DocumentVerification[]>;

  listByOrganization(
    organizationId: string,
    filter?: ListDocumentVerificationsFilter,
  ): Promise<DocumentVerification[]>;

  /** Opens a PENDING decision cycle for a Version and records a "verification created" Audit Record atomically. */
  createWithAudit(
    data: CreateDocumentVerificationData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentVerification>;

  /** Records the reviewer's decision plus an Audit Record (before/after) atomically. */
  updateStatusWithAudit(
    id: string,
    data: UpdateVerificationStatusData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentVerification>;

  countByStatus(organizationId: string, status: VerificationStatus): Promise<number>;
}
