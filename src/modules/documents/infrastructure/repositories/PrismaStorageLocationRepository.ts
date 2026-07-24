// ============================================================================
// src/modules/documents/infrastructure/repositories/PrismaStorageLocationRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateStorageLocationData,
  StorageLocationRepository,
} from "../../domain/repositories/StorageLocationRepository";
import type { StorageLocation } from "../../domain/entities/StorageLocation";
import {
  DEFAULT_LOCAL_STORAGE_CONFIGURATION,
  DEFAULT_LOCAL_STORAGE_LOCATION_NAME,
} from "../../domain/entities/StorageLocation";
import { toStorageLocation } from "../mappers/documentsMapper";

export class PrismaStorageLocationRepository implements StorageLocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<StorageLocation | null> {
    const row = await this.prisma.storageLocation.findUnique({ where: { id } });
    return row ? toStorageLocation(row) : null;
  }

  async findDefaultLocal(organizationId: string): Promise<StorageLocation | null> {
    const row = await this.prisma.storageLocation.findFirst({
      where: {
        organizationId,
        providerType: "LOCAL_DISK",
        status: "ACTIVE",
        name: DEFAULT_LOCAL_STORAGE_LOCATION_NAME,
      },
      orderBy: { createdAt: "asc" },
    });
    return row ? toStorageLocation(row) : null;
  }

  async create(data: CreateStorageLocationData): Promise<StorageLocation> {
    const row = await this.prisma.storageLocation.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        providerType: data.providerType,
        configuration: data.configuration as Prisma.InputJsonValue,
      },
    });
    return toStorageLocation(row);
  }

  async getOrCreateDefaultLocal(organizationId: string): Promise<StorageLocation> {
    const existing = await this.findDefaultLocal(organizationId);
    if (existing) return existing;

    return this.create({
      organizationId,
      name: DEFAULT_LOCAL_STORAGE_LOCATION_NAME,
      providerType: "LOCAL_DISK",
      configuration: DEFAULT_LOCAL_STORAGE_CONFIGURATION,
    });
  }
}
