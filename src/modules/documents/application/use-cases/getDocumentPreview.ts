// ============================================================================
// src/modules/documents/application/use-cases/getDocumentPreview.ts
//
// Preview metadata for a Document's current revision: enough for a viewer
// to decide how to render the file, with no bytes transferred. A Document
// with no CURRENT Version cannot exist (createUploadWithAudit writes both
// or neither), so a missing Version here means the lineage was corrupted
// out-of-band and is surfaced as an error rather than an empty preview.
// ============================================================================

import type { AttachmentRepository } from "../../domain/repositories/AttachmentRepository";
import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import {
  AttachmentNotFoundError,
  DocumentNotFoundError,
  DocumentVersionNotFoundError,
} from "../../domain/errors/DocumentErrors";
import { toDocumentPreviewDto, type DocumentPreviewDto } from "../dto/DocumentPreviewDto";

export function makeGetDocumentPreview(
  repository: DocumentRepository,
  attachmentRepository: AttachmentRepository,
) {
  return async function getDocumentPreview(documentId: string): Promise<DocumentPreviewDto> {
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

    return toDocumentPreviewDto(version, attachment);
  };
}
