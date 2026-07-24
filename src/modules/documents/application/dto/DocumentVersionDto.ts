// ============================================================================
// src/modules/documents/application/dto/DocumentVersionDto.ts
// ============================================================================

import type { DocumentVersion } from "../../domain/entities/DocumentVersion";

export interface DocumentVersionDto {
  id: string;
  documentId: string;
  versionNumber: number;
  attachmentId: string;
  storageLocationId: string;
  status: DocumentVersion["status"];
  uploadedByUserId: string;
  createdAt: string;
}

export function toDocumentVersionDto(version: DocumentVersion): DocumentVersionDto {
  return {
    id: version.id,
    documentId: version.documentId,
    versionNumber: version.versionNumber,
    attachmentId: version.attachmentId,
    storageLocationId: version.storageLocationId,
    status: version.status,
    uploadedByUserId: version.uploadedByUserId,
    createdAt: version.createdAt.toISOString(),
  };
}
