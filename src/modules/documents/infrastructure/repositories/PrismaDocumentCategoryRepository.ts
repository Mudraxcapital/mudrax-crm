// ============================================================================
// src/modules/documents/infrastructure/repositories/PrismaDocumentCategoryRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateDocumentCategoryData,
  DocumentCategoryRepository,
  UpdateDocumentCategoryData,
} from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentCategory } from "../../domain/entities/DocumentCategory";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import { toDocumentCategory } from "../mappers/documentsMapper";

const TARGET_TYPE = "DocumentCategory";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(category: DocumentCategory): Prisma.InputJsonValue {
  return {
    id: category.id,
    organizationId: category.organizationId,
    name: category.name,
    isActive: category.isActive,
  };
}

export class PrismaDocumentCategoryRepository implements DocumentCategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<DocumentCategory | null> {
    const row = await this.prisma.documentCategory.findUnique({ where: { id } });
    return row ? toDocumentCategory(row) : null;
  }

  async findByName(organizationId: string, name: string): Promise<DocumentCategory | null> {
    const row = await this.prisma.documentCategory.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    return row ? toDocumentCategory(row) : null;
  }

  async list(organizationId: string): Promise<DocumentCategory[]> {
    const rows = await this.prisma.documentCategory.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return rows.map(toDocumentCategory);
  }

  async createWithAudit(
    data: CreateDocumentCategoryData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentCategory> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.documentCategory.create({
        data: { organizationId: data.organizationId, name: data.name },
      });
      const category = toDocumentCategory(row);

      await tx.auditTrail.create({
        data: {
          organizationId: category.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentCategoryCreated",
          targetType: TARGET_TYPE,
          targetId: category.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(category),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return category;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateDocumentCategoryData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentCategory> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.documentCategory.findUniqueOrThrow({ where: { id } });
      const before = toDocumentCategory(beforeRow);

      const afterRow = await tx.documentCategory.update({
        where: { id },
        data: { name: data.name, isActive: data.isActive },
      });
      const after = toDocumentCategory(afterRow);

      await tx.auditTrail.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentCategoryUpdated",
          targetType: TARGET_TYPE,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }
}
