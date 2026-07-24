// ============================================================================
// src/modules/documents/domain/repositories/AttachmentRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaAttachmentRepository.
//
// Note that the upload write path does *not* go through `createWithAudit`:
// promoting an Attachment into a Document plus its first Version has to be
// one transaction, so DocumentRepository.createUploadWithAudit owns that
// composite write. This repository serves the read side (Preview/Download
// resolve an Attachment's stored metadata) plus standalone registration of
// a raw file that has not been classified yet.
// ============================================================================

import type { Attachment, AttachmentStatus } from "../entities/Attachment";
import type { DocumentsAuditActor } from "../entities/DocumentsAuditRecord";

export interface CreateAttachmentData {
  organizationId: string;
  uploadedByUserId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  storageLocationId: string;
  storageKey: string;
  status?: AttachmentStatus;
}

export interface AttachmentRepository {
  findById(id: string): Promise<Attachment | null>;

  /** Registers a raw uploaded file and records an "attachment created" Audit Record atomically. */
  createWithAudit(
    data: CreateAttachmentData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<Attachment>;
}
