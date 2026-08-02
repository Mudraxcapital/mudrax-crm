// ============================================================================
// External audio storage for Call Recordings (ADR 0006 — payload is always a
// storage reference, never inlined in the aggregate / database).
// ============================================================================

export interface StoreRecordingFileInput {
  organizationId: string;
  relativeKey: string;
  content: Buffer;
  mimeType: string;
}

export interface StoreRecordingFileResult {
  storageKey: string;
  sizeBytes: number;
  checksum: string;
}

export interface RecordingStoragePort {
  store(input: StoreRecordingFileInput): Promise<StoreRecordingFileResult>;
  retrieve(storageKey: string): Promise<Buffer>;
  exists(storageKey: string): Promise<boolean>;
}
