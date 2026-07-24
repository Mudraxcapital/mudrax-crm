// ============================================================================
// src/modules/telephony/infrastructure/repositories/PrismaExtensionRepository.ts
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import type {
  CreateExtensionData,
  ExtensionRepository,
} from "../../domain/repositories/ExtensionRepository";
import type { Extension } from "../../domain/entities/Extension";
import { toExtension } from "../mappers/telephonyMapper";

export class PrismaExtensionRepository implements ExtensionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Extension | null> {
    const row = await this.prisma.extension.findUnique({ where: { id } });
    return row ? toExtension(row) : null;
  }

  async findByUserId(userId: string): Promise<Extension | null> {
    const row = await this.prisma.extension.findFirst({ where: { userId } });
    return row ? toExtension(row) : null;
  }

  async create(data: CreateExtensionData): Promise<Extension> {
    const row = await this.prisma.extension.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        extensionNumber: data.extensionNumber,
      },
    });
    return toExtension(row);
  }
}
