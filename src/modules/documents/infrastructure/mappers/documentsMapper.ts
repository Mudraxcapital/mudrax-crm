// ============================================================================
// src/modules/documents/infrastructure/mappers/documentsMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated Document/Attachment/DocumentVersion/
// DocumentVerification/DocumentCategory/DocumentType/StorageLocation/
// AuditTrail shapes.
// ============================================================================

import type {
  Attachment as PrismaAttachment,
  AuditTrail as PrismaAuditTrail,
  Document as PrismaDocument,
  DocumentCategory as PrismaDocumentCategory,
  DocumentType as PrismaDocumentType,
  DocumentVerification as PrismaDocumentVerification,
  DocumentVersion as PrismaDocumentVersion,
  StorageLocation as PrismaStorageLocation,
} from "@prisma/client";
import type { Attachment } from "../../domain/entities/Attachment";
import type { Document } from "../../domain/entities/Document";
import type { DocumentCategory } from "../../domain/entities/DocumentCategory";
import type { DocumentType } from "../../domain/entities/DocumentType";
import type { DocumentVerification } from "../../domain/entities/DocumentVerification";
import type { DocumentVersion } from "../../domain/entities/DocumentVersion";
import type { DocumentsAuditRecord } from "../../domain/entities/DocumentsAuditRecord";
import type { StorageLocation } from "../../domain/entities/StorageLocation";

export function toDocumentCategory(row: PrismaDocumentCategory): DocumentCategory {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toDocumentType(row: PrismaDocumentType): DocumentType {
  return {
    id: row.id,
    organizationId: row.organizationId,
    documentCategoryId: row.documentCategoryId,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toStorageLocation(row: PrismaStorageLocation): StorageLocation {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    providerType: row.providerType,
    configuration: row.configuration as Record<string, unknown>,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toAttachment(row: PrismaAttachment): Attachment {
  return {
    id: row.id,
    organizationId: row.organizationId,
    uploadSessionId: row.uploadSessionId,
    uploadedByUserId: row.uploadedByUserId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes),
    checksum: row.checksum,
    storageLocationId: row.storageLocationId,
    storageKey: row.storageKey,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toDocument(row: PrismaDocument): Document {
  return {
    id: row.id,
    organizationId: row.organizationId,
    documentTypeId: row.documentTypeId,
    ownerType: row.ownerType,
    ownerId: row.ownerId,
    status: row.status,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toDocumentVersion(row: PrismaDocumentVersion): DocumentVersion {
  return {
    id: row.id,
    documentId: row.documentId,
    versionNumber: row.versionNumber,
    attachmentId: row.attachmentId,
    storageLocationId: row.storageLocationId,
    status: row.status,
    uploadedByUserId: row.uploadedByUserId,
    createdAt: row.createdAt,
  };
}

export function toDocumentVerification(row: PrismaDocumentVerification): DocumentVerification {
  return {
    id: row.id,
    organizationId: row.organizationId,
    documentVersionId: row.documentVersionId,
    method: row.method,
    status: row.status,
    verifiedByUserId: row.verifiedByUserId,
    verifiedAt: row.verifiedAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toDocumentsAuditRecord(row: PrismaAuditTrail): DocumentsAuditRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    occurredAt: row.occurredAt,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: row.beforeState as Record<string, unknown> | null,
    afterState: row.afterState as Record<string, unknown> | null,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}
