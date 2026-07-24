// ============================================================================
// src/modules/documents/application/dto/AttachmentDto.ts
//
// `sizeBytes` crosses the wire as a plain `number` — the entity already
// narrowed the schema's BigInt, and no file this system accepts approaches
// Number.MAX_SAFE_INTEGER.
//
// `storageKey` is deliberately *not* exposed: it is an internal storage
// reference, and downloads are served through the module's own use-case so
// authorization is never bypassed by handing a client a raw path.
// ============================================================================

import type { Attachment } from "../../domain/entities/Attachment";

export interface AttachmentDto {
  id: string;
  organizationId: string;
  uploadedByUserId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  storageLocationId: string;
  status: Attachment["status"];
  createdAt: string;
  updatedAt: string;
}

export function toAttachmentDto(attachment: Attachment): AttachmentDto {
  return {
    id: attachment.id,
    organizationId: attachment.organizationId,
    uploadedByUserId: attachment.uploadedByUserId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    checksum: attachment.checksum,
    storageLocationId: attachment.storageLocationId,
    status: attachment.status,
    createdAt: attachment.createdAt.toISOString(),
    updatedAt: attachment.updatedAt.toISOString(),
  };
}
