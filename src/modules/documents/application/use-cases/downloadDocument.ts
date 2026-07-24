// ============================================================================
// src/modules/documents/application/use-cases/downloadDocument.ts
//
// Streams a Document's current revision back to the caller. Bytes are
// always fetched through the IStorageProvider using the Attachment's stored
// key — the key itself is never handed to a client, so no download can
// bypass this module's authorization or audit surface.
// ============================================================================

import type { AttachmentRepository } from "../../domain/repositories/AttachmentRepository";
import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import {
  AttachmentNotFoundError,
  DocumentNotFoundError,
  DocumentVersionNotFoundError,
} from "../../domain/errors/DocumentErrors";
import type { DocumentStoragePort } from "../ports/DocumentStoragePort";

export interface DownloadedDocumentFile {
  fileName: string;
  mimeType: string;
  content: Buffer;
  versionNumber: number;
}

export function makeDownloadDocument(
  repository: DocumentRepository,
  attachmentRepository: AttachmentRepository,
  storage: DocumentStoragePort,
) {
  return async function downloadDocument(documentId: string): Promise<DownloadedDocumentFile> {
    const document = await repository.findById(documentId);
    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    const version = await repository.findCurrentVersion(documentId);
    if (!version) {
      throw new DocumentVersionNotFoundError(documentId);
    }

    const attachment = await attachmentRepository.findById(version.attachmentId);
    if (!attachment) {
      throw new AttachmentNotFoundError(version.attachmentId);
    }

    const content = await storage.retrieve(attachment.storageKey);

    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      content,
      versionNumber: version.versionNumber,
    };
  };
}
