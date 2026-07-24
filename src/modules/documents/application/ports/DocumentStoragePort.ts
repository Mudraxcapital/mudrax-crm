// ============================================================================
// src/modules/documents/application/ports/DocumentStoragePort.ts
//
// The `IStorageProvider` port ADR 0007 requires all document write/read
// logic to depend on instead of a specific storage SDK: file bytes are
// always an external Storage Reference, and vendor-specific code lives
// entirely in src/integrations/storage/*.
//
// This task explicitly implements the abstraction plus a local-disk adapter
// only — S3/Azure Blob/NAS are out of scope, and a future adapter slots in
// behind this same interface without touching any domain/use-case/
// presentation code.
//
// Storage is deliberately *not* transactional: bytes are written before the
// database transaction opens, so a failed transaction can leave an orphan
// object. That is the safe direction — an unreferenced blob is reclaimable,
// a Document row pointing at bytes that were never written is not.
// ============================================================================

export interface StoreDocumentFileInput {
  organizationId: string;
  /** Caller-built, storage-agnostic path fragment (never an absolute path); the adapter resolves it under its own configured root. */
  relativeKey: string;
  content: Buffer;
  mimeType: string;
}

export interface StoreDocumentFileResult {
  /** The adapter's canonical reference to the stored bytes, persisted on the Attachment. */
  storageKey: string;
  sizeBytes: number;
  /** SHA-256 of the stored bytes, lowercase hex — the tamper-evidence anchor for the Version's content. */
  checksum: string;
}

export interface DocumentStoragePort {
  store(input: StoreDocumentFileInput): Promise<StoreDocumentFileResult>;
  retrieve(storageKey: string): Promise<Buffer>;
  exists(storageKey: string): Promise<boolean>;
}
