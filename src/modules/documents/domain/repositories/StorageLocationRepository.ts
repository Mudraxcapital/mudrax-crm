// ============================================================================
// src/modules/documents/domain/repositories/StorageLocationRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaStorageLocationRepository.
//
// Intentionally minimal — Storage Location *management* (provisioning S3
// buckets, deprecating backends, migrating keys) is out of scope for this
// task's "Implement ONLY" list. This module only needs enough of the
// concept — get-or-create the Organization's local backend — to satisfy
// Attachment's and Document Version's mandatory `storageLocationId` foreign
// keys, which is why these writes carry no Audit Record: the row is
// infrastructure bookkeeping, not a business decision.
// ============================================================================

import type { StorageLocation, StorageProviderType } from "../entities/StorageLocation";

export interface CreateStorageLocationData {
  organizationId: string;
  name: string;
  providerType: StorageProviderType;
  configuration: Record<string, unknown>;
}

export interface StorageLocationRepository {
  findById(id: string): Promise<StorageLocation | null>;

  /** The Organization's ACTIVE LOCAL_DISK backend, if one has been provisioned. */
  findDefaultLocal(organizationId: string): Promise<StorageLocation | null>;

  create(data: CreateStorageLocationData): Promise<StorageLocation>;

  /** Resolves the Organization's local backend, provisioning DEFAULT_LOCAL_STORAGE_LOCATION_NAME on first use so an upload never fails merely because no backend was configured yet. */
  getOrCreateDefaultLocal(organizationId: string): Promise<StorageLocation>;
}
