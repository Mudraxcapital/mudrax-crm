// ============================================================================
// src/modules/documents/application/use-cases/storeDocumentFile.ts
//
// Shared helper for the two write paths that put bytes on disk (first
// upload and re-upload): decode the transported payload, derive a
// collision-free, owner-scoped storage key, hand the bytes to the
// configured IStorageProvider, and return exactly the facts the Attachment
// row needs.
//
// Bytes are written before the database transaction opens, because storage
// is not transactional (see DocumentStoragePort). A key is never reused, so
// a retried upload can never overwrite an earlier revision's bytes — the
// immutability guarantee Document Version makes only holds if the object it
// points at is equally write-once.
// ============================================================================

import { randomUUID } from "node:crypto";
import type { DocumentOwnerType } from "../../domain/entities/Document";
import type { StorageLocation } from "../../domain/entities/StorageLocation";
import type { UploadAttachmentData } from "../../domain/repositories/DocumentRepository";
import type { DocumentStoragePort } from "../ports/DocumentStoragePort";

export interface StoreDocumentFileCommand {
  organizationId: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

/** Reduces a client-supplied file name to a path-safe segment: no separators, no traversal, no shell-significant characters. */
function toSafeFileNameSegment(fileName: string): string {
  const sanitized = fileName
    .trim()
    .replace(/\.{2,}/g, ".")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 120);

  return sanitized.length > 0 ? sanitized : "file";
}

export async function storeDocumentFile(
  storage: DocumentStoragePort,
  storageLocation: StorageLocation,
  command: StoreDocumentFileCommand,
): Promise<UploadAttachmentData> {
  const content = Buffer.from(command.contentBase64, "base64");

  const relativeKey = [
    command.organizationId,
    command.ownerType.toLowerCase(),
    command.ownerId,
    `${randomUUID()}-${toSafeFileNameSegment(command.fileName)}`,
  ].join("/");

  const stored = await storage.store({
    organizationId: command.organizationId,
    relativeKey,
    content,
    mimeType: command.mimeType,
  });

  return {
    fileName: command.fileName,
    mimeType: command.mimeType,
    sizeBytes: stored.sizeBytes,
    checksum: stored.checksum,
    storageLocationId: storageLocation.id,
    storageKey: stored.storageKey,
  };
}
