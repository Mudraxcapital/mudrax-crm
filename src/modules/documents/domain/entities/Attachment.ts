// ============================================================================
// src/modules/documents/domain/entities/Attachment.ts
//
// Aggregate Root; the generic registration of one raw uploaded file, before
// any business meaning is attached to it (ADR 0007). Not every Attachment
// is promoted to a Document — but every Document Version pins exactly one.
//
// `sizeBytes` is a `BigInt` column in prisma/models/documents.prisma; the
// infrastructure mapper narrows it to a JS `number` here so no BigInt ever
// reaches a Server Component boundary (BigInt is not JSON-serializable).
// File sizes in this system are far below Number.MAX_SAFE_INTEGER.
//
// Antivirus scanning (SCANNING/CLEAN/INFECTED) is out of scope for this
// task; the statuses exist in the schema so a future scanner needs no
// migration.
// ============================================================================

export const ATTACHMENT_STATUSES = [
  "UPLOADING",
  "SCANNING",
  "CLEAN",
  "INFECTED",
  "AVAILABLE",
  "PROMOTED_TO_DOCUMENT",
  "ARCHIVED",
  "PURGED",
] as const;
export type AttachmentStatus = (typeof ATTACHMENT_STATUSES)[number];

export interface Attachment {
  id: string;
  organizationId: string;
  uploadSessionId: string | null;
  uploadedByUserId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  storageLocationId: string;
  storageKey: string;
  status: AttachmentStatus;
  createdAt: Date;
  updatedAt: Date;
}
