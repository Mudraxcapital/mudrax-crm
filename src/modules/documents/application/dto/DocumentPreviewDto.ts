// ============================================================================
// src/modules/documents/application/dto/DocumentPreviewDto.ts
//
// Preview metadata for a Document's current revision — everything a viewer
// needs to decide how to render (or whether it can render) the file, with
// no bytes attached. Fetching the bytes is a separate, separately
// authorized use-case (downloadDocument).
// ============================================================================

import type { Attachment } from "../../domain/entities/Attachment";
import type { DocumentVersion } from "../../domain/entities/DocumentVersion";

export interface DocumentPreviewDto {
  documentId: string;
  versionId: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

export function toDocumentPreviewDto(
  version: DocumentVersion,
  attachment: Attachment,
): DocumentPreviewDto {
  return {
    documentId: version.documentId,
    versionId: version.id,
    versionNumber: version.versionNumber,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    checksum: attachment.checksum,
  };
}
