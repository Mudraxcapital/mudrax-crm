// ============================================================================
// src/modules/documents/domain/entities/StorageLocation.ts
//
// Aggregate Root; one configured storage backend binding, distinguished
// only by a Storage Provider Type discriminator (ADR 0007). Vendor-specific
// code lives in src/integrations/storage/*, never here.
//
// This reduced-scope implementation only ever provisions and resolves the
// LOCAL_DISK location — S3/Azure/NAS are out of scope per this task's
// "Implement ONLY" list, but the discriminator carries every schema value
// so a future adapter needs no schema or entity change.
// ============================================================================

export const STORAGE_PROVIDER_TYPES = ["LOCAL_DISK", "NAS", "S3", "AZURE_BLOB"] as const;
export type StorageProviderType = (typeof STORAGE_PROVIDER_TYPES)[number];

export const STORAGE_LOCATION_STATUSES = ["ACTIVE", "DEPRECATED", "RETIRED"] as const;
export type StorageLocationStatus = (typeof STORAGE_LOCATION_STATUSES)[number];

/** Name of the Storage Location auto-provisioned on first upload when an Organization has no local backend configured yet. */
export const DEFAULT_LOCAL_STORAGE_LOCATION_NAME = "Default Local Storage";

/** Configuration of the auto-provisioned local backend: every storage key is resolved relative to this root. */
export const DEFAULT_LOCAL_STORAGE_CONFIGURATION: Record<string, unknown> = { rootPath: "local" };

export interface StorageLocation {
  id: string;
  organizationId: string;
  name: string;
  providerType: StorageProviderType;
  /** Bucket/region/path etc. Secret credentials are referenced by id from a centralized secrets store (platform-contracts.md §3) — never embedded inline here. */
  configuration: Record<string, unknown>;
  status: StorageLocationStatus;
  createdAt: Date;
  updatedAt: Date;
}
