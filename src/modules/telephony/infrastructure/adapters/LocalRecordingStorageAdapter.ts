// ============================================================================
// Local-disk RecordingStoragePort — reuses the documents local adapter shape
// with a telephony-specific root (CALL_RECORDINGS_LOCAL_STORAGE_ROOT).
// ============================================================================

import { LocalDiskStorageAdapter } from "@/integrations/storage/local/LocalDiskStorageAdapter";
import path from "node:path";
import type {
  RecordingStoragePort,
  StoreRecordingFileInput,
  StoreRecordingFileResult,
} from "../../application/ports/RecordingStoragePort";

const DEFAULT_ROOT = path.join(process.cwd(), ".data", "call-recordings-storage");

export class LocalRecordingStorageAdapter implements RecordingStoragePort {
  private readonly disk: LocalDiskStorageAdapter;

  constructor(
    rootDir: string = process.env.CALL_RECORDINGS_LOCAL_STORAGE_ROOT ?? DEFAULT_ROOT,
  ) {
    this.disk = new LocalDiskStorageAdapter(rootDir);
  }

  store(input: StoreRecordingFileInput): Promise<StoreRecordingFileResult> {
    return this.disk.store(input);
  }

  retrieve(storageKey: string): Promise<Buffer> {
    return this.disk.retrieve(storageKey);
  }

  exists(storageKey: string): Promise<boolean> {
    return this.disk.exists(storageKey);
  }
}
