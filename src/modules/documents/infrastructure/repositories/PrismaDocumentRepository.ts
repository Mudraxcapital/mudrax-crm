// ============================================================================
// src/modules/documents/infrastructure/repositories/PrismaDocumentRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AddDocumentVersionData,
  CreateDocumentUploadData,
  DocumentRepository,
  DocumentsByCategoryEntry,
  DocumentWithCurrentVersion,
  ListDocumentsFilter,
  UpdateDocumentMetadataData,
} from "../../domain/repositories/DocumentRepository";
import type { Document, DocumentOwnerType } from "../../domain/entities/Document";
import type { DocumentVersion } from "../../domain/entities/DocumentVersion";
import type {
  DocumentsAuditActor,
  DocumentsAuditRecord,
  DocumentsAuditTargetType,
} from "../../domain/entities/DocumentsAuditRecord";
import { toDocument, toDocumentsAuditRecord, toDocumentVersion } from "../mappers/documentsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toDocumentAuditJson(document: Document): Prisma.InputJsonValue {
  return {
    id: document.id,
    organizationId: document.organizationId,
    documentTypeId: document.documentTypeId,
    ownerType: document.ownerType,
    ownerId: document.ownerId,
    status: document.status,
    createdByUserId: document.createdByUserId,
  };
}

function toVersionAuditJson(version: DocumentVersion): Prisma.InputJsonValue {
  return {
    id: version.id,
    documentId: version.documentId,
    versionNumber: version.versionNumber,
    attachmentId: version.attachmentId,
    storageLocationId: version.storageLocationId,
    status: version.status,
    uploadedByUserId: version.uploadedByUserId,
  };
}

export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Document | null> {
    const row = await this.prisma.document.findUnique({ where: { id } });
    return row ? toDocument(row) : null;
  }

  async list(organizationId: string, filter?: ListDocumentsFilter): Promise<Document[]> {
    const rows = await this.prisma.document.findMany({
      where: {
        organizationId,
        ownerType: filter?.ownerType,
        ownerId: filter?.ownerId,
        documentTypeId: filter?.documentTypeId,
        status: filter?.status,
      },
      orderBy: { createdAt: "desc" },
      take: filter?.limit,
      skip: filter?.offset,
    });
    return rows.map(toDocument);
  }

  async listByOwner(ownerType: DocumentOwnerType, ownerId: string): Promise<Document[]> {
    const rows = await this.prisma.document.findMany({
      where: { ownerType, ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDocument);
  }

  async count(organizationId: string, filter?: ListDocumentsFilter): Promise<number> {
    return this.prisma.document.count({
      where: {
        organizationId,
        ownerType: filter?.ownerType,
        ownerId: filter?.ownerId,
        documentTypeId: filter?.documentTypeId,
        status: filter?.status,
      },
    });
  }

  async createUploadWithAudit(
    data: CreateDocumentUploadData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentWithCurrentVersion> {
    return this.prisma.$transaction(async (tx) => {
      const attachmentRow = await tx.attachment.create({
        data: {
          organizationId: data.organizationId,
          uploadedByUserId: data.uploadedByUserId,
          fileName: data.attachment.fileName,
          mimeType: data.attachment.mimeType,
          sizeBytes: BigInt(data.attachment.sizeBytes),
          checksum: data.attachment.checksum,
          storageLocationId: data.attachment.storageLocationId,
          storageKey: data.attachment.storageKey,
          status: "PROMOTED_TO_DOCUMENT",
        },
      });

      const documentRow = await tx.document.create({
        data: {
          organizationId: data.organizationId,
          documentTypeId: data.documentTypeId,
          ownerType: data.ownerType,
          ownerId: data.ownerId,
          status: "ACTIVE",
          createdByUserId: data.createdByUserId,
        },
      });
      const document = toDocument(documentRow);

      const versionRow = await tx.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 1,
          attachmentId: attachmentRow.id,
          storageLocationId: data.attachment.storageLocationId,
          status: "CURRENT",
          uploadedByUserId: data.uploadedByUserId,
        },
      });
      const currentVersion = toDocumentVersion(versionRow);

      await tx.auditTrail.create({
        data: {
          organizationId: document.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentUploaded",
          targetType: "Document",
          targetId: document.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: {
            document: toDocumentAuditJson(document),
            version: toVersionAuditJson(currentVersion),
            attachmentId: attachmentRow.id,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return { document, currentVersion };
    });
  }

  async addVersionWithAudit(
    data: AddDocumentVersionData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentWithCurrentVersion> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.document.findUniqueOrThrow({ where: { id: data.documentId } });
      const before = toDocument(beforeRow);

      const currentVersionRow = await tx.documentVersion.findFirst({
        where: { documentId: data.documentId, status: "CURRENT" },
      });
      if (!currentVersionRow) {
        throw new Error(`Document ${data.documentId} has no CURRENT version.`);
      }

      await tx.documentVersion.update({
        where: { id: currentVersionRow.id },
        data: { status: "SUPERSEDED" },
      });

      const attachmentRow = await tx.attachment.create({
        data: {
          organizationId: before.organizationId,
          uploadedByUserId: data.uploadedByUserId,
          fileName: data.attachment.fileName,
          mimeType: data.attachment.mimeType,
          sizeBytes: BigInt(data.attachment.sizeBytes),
          checksum: data.attachment.checksum,
          storageLocationId: data.attachment.storageLocationId,
          storageKey: data.attachment.storageKey,
          status: "PROMOTED_TO_DOCUMENT",
        },
      });

      const versionRow = await tx.documentVersion.create({
        data: {
          documentId: data.documentId,
          versionNumber: currentVersionRow.versionNumber + 1,
          attachmentId: attachmentRow.id,
          storageLocationId: data.attachment.storageLocationId,
          status: "CURRENT",
          uploadedByUserId: data.uploadedByUserId,
        },
      });
      const currentVersion = toDocumentVersion(versionRow);

      const afterRow = await tx.document.update({
        where: { id: data.documentId },
        data: { status: before.status === "REJECTED" ? "ACTIVE" : before.status },
      });
      const document = toDocument(afterRow);

      await tx.auditTrail.create({
        data: {
          organizationId: document.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentVersionCreated",
          targetType: "Document",
          targetId: document.id,
          correlationId: correlationId ?? null,
          beforeState: {
            document: toDocumentAuditJson(before),
            supersededVersionId: currentVersionRow.id,
          },
          afterState: {
            document: toDocumentAuditJson(document),
            version: toVersionAuditJson(currentVersion),
            attachmentId: attachmentRow.id,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return { document, currentVersion };
    });
  }

  async updateMetadataWithAudit(
    id: string,
    data: UpdateDocumentMetadataData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<Document> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.document.findUniqueOrThrow({ where: { id } });
      const before = toDocument(beforeRow);

      const afterRow = await tx.document.update({
        where: { id },
        data: {
          documentTypeId: data.documentTypeId,
          status: data.status,
        },
      });
      const after = toDocument(afterRow);

      await tx.auditTrail.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentMetadataUpdated",
          targetType: "Document",
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toDocumentAuditJson(before),
          afterState: toDocumentAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async listAuditLog(
    targetType: DocumentsAuditTargetType,
    targetId: string,
  ): Promise<DocumentsAuditRecord[]> {
    const rows = await this.prisma.auditTrail.findMany({
      where: { targetType, targetId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toDocumentsAuditRecord);
  }

  async findVersionById(id: string): Promise<DocumentVersion | null> {
    const row = await this.prisma.documentVersion.findUnique({ where: { id } });
    return row ? toDocumentVersion(row) : null;
  }

  async findCurrentVersion(documentId: string): Promise<DocumentVersion | null> {
    const row = await this.prisma.documentVersion.findFirst({
      where: { documentId, status: "CURRENT" },
    });
    return row ? toDocumentVersion(row) : null;
  }

  async listVersions(documentId: string): Promise<DocumentVersion[]> {
    const rows = await this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: "desc" },
    });
    return rows.map(toDocumentVersion);
  }

  async findCurrentVersionsByDocumentIds(
    documentIds: readonly string[],
  ): Promise<DocumentVersion[]> {
    if (documentIds.length === 0) return [];
    const rows = await this.prisma.documentVersion.findMany({
      where: { documentId: { in: [...documentIds] }, status: "CURRENT" },
    });
    return rows.map(toDocumentVersion);
  }

  async listRecent(organizationId: string, limit: number): Promise<Document[]> {
    const rows = await this.prisma.document.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toDocument);
  }

  async countByCategory(organizationId: string): Promise<DocumentsByCategoryEntry[]> {
    const rows = await this.prisma.document.groupBy({
      by: ["documentTypeId"],
      where: { organizationId },
      _count: { _all: true },
    });

    if (rows.length === 0) return [];

    const documentTypes = await this.prisma.documentType.findMany({
      where: { id: { in: rows.map((row) => row.documentTypeId) } },
      include: { documentCategory: true },
    });
    const typeById = new Map(documentTypes.map((type) => [type.id, type]));

    const countsByCategory = new Map<string, DocumentsByCategoryEntry>();
    for (const row of rows) {
      const documentType = typeById.get(row.documentTypeId);
      if (!documentType) continue;
      const categoryId = documentType.documentCategoryId;
      const existing = countsByCategory.get(categoryId);
      if (existing) {
        existing.count += row._count._all;
      } else {
        countsByCategory.set(categoryId, {
          documentCategoryId: categoryId,
          categoryName: documentType.documentCategory.name,
          count: row._count._all,
        });
      }
    }

    return [...countsByCategory.values()].sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName),
    );
  }
}
