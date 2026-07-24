// ============================================================================
// src/integrations/storage/local/LocalDiskStorageAdapter.ts
//
// The only `IStorageProvider` (documents module's DocumentStoragePort)
// implementation wired today. Per this task's scope it writes bytes to a
// configurable local directory — AWS S3 / Azure Blob / Google Cloud Storage
// are explicitly excluded. A future PR adds a real cloud adapter alongside
// this one, behind the same port — no domain/use-case/presentation code
// changes required (ADR 0007).
// ============================================================================

import { createHash } from "node:crypto";
import { mkdir, readFile, access, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  DocumentStoragePort,
  StoreDocumentFileInput,
  StoreDocumentFileResult,
} from "@/modules/documents/application/ports/DocumentStoragePort";

const DEFAULT_ROOT = path.join(process.cwd(), ".data", "documents-storage");

export class LocalDiskStorageAdapter implements DocumentStoragePort {
  private readonly rootDir: string;

  constructor(rootDir: string = process.env.DOCUMENTS_LOCAL_STORAGE_ROOT ?? DEFAULT_ROOT) {
    this.rootDir = path.resolve(rootDir);
  }

  async store(input: StoreDocumentFileInput): Promise<StoreDocumentFileResult> {
    const storageKey = this.toStorageKey(input.relativeKey);
    const absolutePath = this.resolvePath(storageKey);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.content);

    return {
      storageKey,
      sizeBytes: input.content.byteLength,
      checksum: createHash("sha256").update(input.content).digest("hex"),
    };
  }

  async retrieve(storageKey: string): Promise<Buffer> {
    return readFile(this.resolvePath(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await access(this.resolvePath(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  private toStorageKey(relativeKey: string): string {
    const normalized = relativeKey
      .replace(/\\/g, "/")
      .split("/")
      .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
      .join("/");

    if (!normalized) {
      throw new Error("A non-empty storage key is required.");
    }

    return normalized;
  }

  private resolvePath(storageKey: string): string {
    const absolutePath = path.resolve(this.rootDir, ...storageKey.split("/"));
    if (!absolutePath.startsWith(this.rootDir + path.sep) && absolutePath !== this.rootDir) {
      throw new Error("Storage key resolves outside the configured local root.");
    }
    return absolutePath;
  }
}
