// ============================================================================
// src/modules/documents/infrastructure/repositories/PrismaDocumentTypeRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateDocumentTypeData,
  DocumentTypeRepository,
  ListDocumentTypesFilter,
  UpdateDocumentTypeData,
} from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentType } from "../../domain/entities/DocumentType";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import { toDocumentType } from "../mappers/documentsMapper";

const TARGET_TYPE = "DocumentType";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(documentType: DocumentType): Prisma.InputJsonValue {
  return {
    id: documentType.id,
    organizationId: documentType.organizationId,
    documentCategoryId: documentType.documentCategoryId,
    name: documentType.name,
    isActive: documentType.isActive,
  };
}

export class PrismaDocumentTypeRepository implements DocumentTypeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<DocumentType | null> {
    const row = await this.prisma.documentType.findUnique({ where: { id } });
    return row ? toDocumentType(row) : null;
  }

  async findByName(organizationId: string, name: string): Promise<DocumentType | null> {
    const row = await this.prisma.documentType.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    return row ? toDocumentType(row) : null;
  }

  async list(organizationId: string, filter?: ListDocumentTypesFilter): Promise<DocumentType[]> {
    const rows = await this.prisma.documentType.findMany({
      where: {
        organizationId,
        documentCategoryId: filter?.documentCategoryId,
      },
      orderBy: { name: "asc" },
    });
    return rows.map(toDocumentType);
  }

  async createWithAudit(
    data: CreateDocumentTypeData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentType> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.documentType.create({
        data: {
          organizationId: data.organizationId,
          documentCategoryId: data.documentCategoryId,
          name: data.name,
        },
      });
      const documentType = toDocumentType(row);

      await tx.auditTrail.create({
        data: {
          organizationId: documentType.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentTypeCreated",
          targetType: TARGET_TYPE,
          targetId: documentType.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(documentType),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return documentType;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateDocumentTypeData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentType> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.documentType.findUniqueOrThrow({ where: { id } });
      const before = toDocumentType(beforeRow);

      const afterRow = await tx.documentType.update({
        where: { id },
        data: {
          name: data.name,
          isActive: data.isActive,
          documentCategoryId: data.documentCategoryId,
        },
      });
      const after = toDocumentType(afterRow);

      await tx.auditTrail.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentTypeUpdated",
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
