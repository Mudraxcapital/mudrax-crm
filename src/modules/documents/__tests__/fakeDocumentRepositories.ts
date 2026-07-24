// ============================================================================
// src/modules/documents/__tests__/fakeDocumentRepositories.ts
// ============================================================================

import type {
  AttachmentRepository,
  CreateAttachmentData,
} from "../domain/repositories/AttachmentRepository";
import type {
  CreateDocumentCategoryData,
  DocumentCategoryRepository,
  UpdateDocumentCategoryData,
} from "../domain/repositories/DocumentCategoryRepository";
import type {
  AddDocumentVersionData,
  CreateDocumentUploadData,
  DocumentRepository,
  DocumentsByCategoryEntry,
  DocumentWithCurrentVersion,
  ListDocumentsFilter,
  UpdateDocumentMetadataData,
} from "../domain/repositories/DocumentRepository";
import type {
  CreateDocumentTypeData,
  DocumentTypeRepository,
  ListDocumentTypesFilter,
  UpdateDocumentTypeData,
} from "../domain/repositories/DocumentTypeRepository";
import type {
  CreateDocumentVerificationData,
  DocumentVerificationRepository,
  ListDocumentVerificationsFilter,
  UpdateVerificationStatusData,
} from "../domain/repositories/DocumentVerificationRepository";
import type {
  CreateStorageLocationData,
  StorageLocationRepository,
} from "../domain/repositories/StorageLocationRepository";
import type { Attachment } from "../domain/entities/Attachment";
import type { Document, DocumentOwnerType } from "../domain/entities/Document";
import type { DocumentCategory } from "../domain/entities/DocumentCategory";
import type { DocumentType } from "../domain/entities/DocumentType";
import type { DocumentVerification } from "../domain/entities/DocumentVerification";
import type { VerificationStatus } from "../domain/entities/DocumentVerification";
import type { DocumentVersion } from "../domain/entities/DocumentVersion";
import type {
  DocumentsAuditActor,
  DocumentsAuditRecord,
  DocumentsAuditTargetType,
} from "../domain/entities/DocumentsAuditRecord";
import type { StorageLocation } from "../domain/entities/StorageLocation";
import {
  DEFAULT_LOCAL_STORAGE_CONFIGURATION,
  DEFAULT_LOCAL_STORAGE_LOCATION_NAME,
} from "../domain/entities/StorageLocation";

let nextId = 1;
function makeId(): string {
  return `00000000-0000-0000-000a-${String(nextId++).padStart(12, "0")}`;
}

function recordAudit(
  log: DocumentsAuditRecord[],
  actor: DocumentsAuditActor,
  action: string,
  targetType: string,
  targetId: string,
  organizationId: string,
  correlationId: string | null | undefined,
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown> | null,
): void {
  const previous = log[log.length - 1];
  log.push({
    id: makeId(),
    organizationId,
    occurredAt: new Date(),
    actorType: actor.actorType,
    actorId: actor.actorId,
    action,
    targetType,
    targetId,
    correlationId: correlationId ?? null,
    beforeState,
    afterState,
    recordHash: `fake-hash-${log.length}`,
    previousRecordHash: previous?.recordHash ?? null,
  });
}

export class FakeDocumentCategoryRepository implements DocumentCategoryRepository {
  categories = new Map<string, DocumentCategory>();
  auditLog: DocumentsAuditRecord[] = [];

  async findById(id: string): Promise<DocumentCategory | null> {
    return this.categories.get(id) ?? null;
  }

  async findByName(organizationId: string, name: string): Promise<DocumentCategory | null> {
    return (
      [...this.categories.values()].find(
        (category) => category.organizationId === organizationId && category.name === name,
      ) ?? null
    );
  }

  async list(organizationId: string): Promise<DocumentCategory[]> {
    return [...this.categories.values()]
      .filter((category) => category.organizationId === organizationId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createWithAudit(
    data: CreateDocumentCategoryData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentCategory> {
    const now = new Date();
    const category: DocumentCategory = {
      id: makeId(),
      organizationId: data.organizationId,
      name: data.name,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.set(category.id, category);
    recordAudit(
      this.auditLog,
      actor,
      "DocumentCategoryCreated",
      "DocumentCategory",
      category.id,
      category.organizationId,
      correlationId,
      null,
      { name: category.name },
    );
    return category;
  }

  async updateWithAudit(
    id: string,
    data: UpdateDocumentCategoryData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentCategory> {
    const before = this.categories.get(id)!;
    const after: DocumentCategory = {
      ...before,
      name: data.name ?? before.name,
      isActive: data.isActive ?? before.isActive,
      updatedAt: new Date(),
    };
    this.categories.set(id, after);
    recordAudit(
      this.auditLog,
      actor,
      "DocumentCategoryUpdated",
      "DocumentCategory",
      id,
      after.organizationId,
      correlationId,
      { name: before.name },
      { name: after.name },
    );
    return after;
  }
}

export class FakeDocumentTypeRepository implements DocumentTypeRepository {
  types = new Map<string, DocumentType>();
  auditLog: DocumentsAuditRecord[] = [];

  async findById(id: string): Promise<DocumentType | null> {
    return this.types.get(id) ?? null;
  }

  async findByName(organizationId: string, name: string): Promise<DocumentType | null> {
    return (
      [...this.types.values()].find(
        (type) => type.organizationId === organizationId && type.name === name,
      ) ?? null
    );
  }

  async list(organizationId: string, filter?: ListDocumentTypesFilter): Promise<DocumentType[]> {
    return [...this.types.values()]
      .filter((type) => type.organizationId === organizationId)
      .filter((type) =>
        filter?.documentCategoryId ? type.documentCategoryId === filter.documentCategoryId : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createWithAudit(
    data: CreateDocumentTypeData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentType> {
    const now = new Date();
    const documentType: DocumentType = {
      id: makeId(),
      organizationId: data.organizationId,
      documentCategoryId: data.documentCategoryId,
      name: data.name,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.types.set(documentType.id, documentType);
    recordAudit(
      this.auditLog,
      actor,
      "DocumentTypeCreated",
      "DocumentType",
      documentType.id,
      documentType.organizationId,
      correlationId,
      null,
      { name: documentType.name },
    );
    return documentType;
  }

  async updateWithAudit(
    id: string,
    data: UpdateDocumentTypeData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentType> {
    const before = this.types.get(id)!;
    const after: DocumentType = {
      ...before,
      documentCategoryId: data.documentCategoryId ?? before.documentCategoryId,
      name: data.name ?? before.name,
      isActive: data.isActive ?? before.isActive,
      updatedAt: new Date(),
    };
    this.types.set(id, after);
    recordAudit(
      this.auditLog,
      actor,
      "DocumentTypeUpdated",
      "DocumentType",
      id,
      after.organizationId,
      correlationId,
      { name: before.name },
      { name: after.name },
    );
    return after;
  }
}

export class FakeStorageLocationRepository implements StorageLocationRepository {
  locations = new Map<string, StorageLocation>();

  async findById(id: string): Promise<StorageLocation | null> {
    return this.locations.get(id) ?? null;
  }

  async findDefaultLocal(organizationId: string): Promise<StorageLocation | null> {
    return (
      [...this.locations.values()].find(
        (location) =>
          location.organizationId === organizationId &&
          location.providerType === "LOCAL_DISK" &&
          location.status === "ACTIVE" &&
          location.name === DEFAULT_LOCAL_STORAGE_LOCATION_NAME,
      ) ?? null
    );
  }

  async create(data: CreateStorageLocationData): Promise<StorageLocation> {
    const now = new Date();
    const location: StorageLocation = {
      id: makeId(),
      organizationId: data.organizationId,
      name: data.name,
      providerType: data.providerType,
      configuration: data.configuration,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    this.locations.set(location.id, location);
    return location;
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

export class FakeAttachmentRepository implements AttachmentRepository {
  attachments = new Map<string, Attachment>();
  auditLog: DocumentsAuditRecord[] = [];

  async findById(id: string): Promise<Attachment | null> {
    return this.attachments.get(id) ?? null;
  }

  async createWithAudit(
    data: CreateAttachmentData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<Attachment> {
    const now = new Date();
    const attachment: Attachment = {
      id: makeId(),
      organizationId: data.organizationId,
      uploadSessionId: null,
      uploadedByUserId: data.uploadedByUserId,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      checksum: data.checksum,
      storageLocationId: data.storageLocationId,
      storageKey: data.storageKey,
      status: data.status ?? "AVAILABLE",
      createdAt: now,
      updatedAt: now,
    };
    this.attachments.set(attachment.id, attachment);
    recordAudit(
      this.auditLog,
      actor,
      "AttachmentCreated",
      "Attachment",
      attachment.id,
      attachment.organizationId,
      correlationId,
      null,
      { fileName: attachment.fileName },
    );
    return attachment;
  }
}

export class FakeDocumentRepository implements DocumentRepository {
  documents = new Map<string, Document>();
  versions = new Map<string, DocumentVersion>();
  attachments = new Map<string, Attachment>();
  auditLog: DocumentsAuditRecord[] = [];

  async findById(id: string): Promise<Document | null> {
    return this.documents.get(id) ?? null;
  }

  async list(organizationId: string, filter?: ListDocumentsFilter): Promise<Document[]> {
    return [...this.documents.values()]
      .filter((document) => document.organizationId === organizationId)
      .filter((document) => (filter?.ownerType ? document.ownerType === filter.ownerType : true))
      .filter((document) => (filter?.ownerId ? document.ownerId === filter.ownerId : true))
      .filter((document) =>
        filter?.documentTypeId ? document.documentTypeId === filter.documentTypeId : true,
      )
      .filter((document) => (filter?.status ? document.status === filter.status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listByOwner(ownerType: DocumentOwnerType, ownerId: string): Promise<Document[]> {
    return [...this.documents.values()]
      .filter((document) => document.ownerType === ownerType && document.ownerId === ownerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async count(organizationId: string, filter?: ListDocumentsFilter): Promise<number> {
    return (await this.list(organizationId, filter)).length;
  }

  async createUploadWithAudit(
    data: CreateDocumentUploadData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentWithCurrentVersion> {
    const now = new Date();
    const attachment: Attachment = {
      id: makeId(),
      organizationId: data.organizationId,
      uploadSessionId: null,
      uploadedByUserId: data.uploadedByUserId,
      fileName: data.attachment.fileName,
      mimeType: data.attachment.mimeType,
      sizeBytes: data.attachment.sizeBytes,
      checksum: data.attachment.checksum,
      storageLocationId: data.attachment.storageLocationId,
      storageKey: data.attachment.storageKey,
      status: "PROMOTED_TO_DOCUMENT",
      createdAt: now,
      updatedAt: now,
    };
    this.attachments.set(attachment.id, attachment);

    const document: Document = {
      id: makeId(),
      organizationId: data.organizationId,
      documentTypeId: data.documentTypeId,
      ownerType: data.ownerType,
      ownerId: data.ownerId,
      status: "ACTIVE",
      createdByUserId: data.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };
    this.documents.set(document.id, document);

    const currentVersion: DocumentVersion = {
      id: makeId(),
      documentId: document.id,
      versionNumber: 1,
      attachmentId: attachment.id,
      storageLocationId: data.attachment.storageLocationId,
      status: "CURRENT",
      uploadedByUserId: data.uploadedByUserId,
      createdAt: now,
    };
    this.versions.set(currentVersion.id, currentVersion);

    recordAudit(
      this.auditLog,
      actor,
      "DocumentUploaded",
      "Document",
      document.id,
      document.organizationId,
      correlationId,
      null,
      { documentId: document.id, versionId: currentVersion.id },
    );

    return { document, currentVersion };
  }

  async addVersionWithAudit(
    data: AddDocumentVersionData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentWithCurrentVersion> {
    const before = this.documents.get(data.documentId)!;
    const current = [...this.versions.values()].find(
      (version) => version.documentId === data.documentId && version.status === "CURRENT",
    )!;
    this.versions.set(current.id, { ...current, status: "SUPERSEDED" });

    const now = new Date();
    const attachment: Attachment = {
      id: makeId(),
      organizationId: before.organizationId,
      uploadSessionId: null,
      uploadedByUserId: data.uploadedByUserId,
      fileName: data.attachment.fileName,
      mimeType: data.attachment.mimeType,
      sizeBytes: data.attachment.sizeBytes,
      checksum: data.attachment.checksum,
      storageLocationId: data.attachment.storageLocationId,
      storageKey: data.attachment.storageKey,
      status: "PROMOTED_TO_DOCUMENT",
      createdAt: now,
      updatedAt: now,
    };
    this.attachments.set(attachment.id, attachment);

    const currentVersion: DocumentVersion = {
      id: makeId(),
      documentId: data.documentId,
      versionNumber: current.versionNumber + 1,
      attachmentId: attachment.id,
      storageLocationId: data.attachment.storageLocationId,
      status: "CURRENT",
      uploadedByUserId: data.uploadedByUserId,
      createdAt: now,
    };
    this.versions.set(currentVersion.id, currentVersion);

    const document: Document = {
      ...before,
      status: before.status === "REJECTED" ? "ACTIVE" : before.status,
      updatedAt: now,
    };
    this.documents.set(document.id, document);

    recordAudit(
      this.auditLog,
      actor,
      "DocumentVersionCreated",
      "Document",
      document.id,
      document.organizationId,
      correlationId,
      { supersededVersionId: current.id },
      { versionId: currentVersion.id },
    );

    return { document, currentVersion };
  }

  async updateMetadataWithAudit(
    id: string,
    data: UpdateDocumentMetadataData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<Document> {
    const before = this.documents.get(id)!;
    const after: Document = {
      ...before,
      documentTypeId: data.documentTypeId ?? before.documentTypeId,
      status: data.status ?? before.status,
      updatedAt: new Date(),
    };
    this.documents.set(id, after);
    recordAudit(
      this.auditLog,
      actor,
      "DocumentMetadataUpdated",
      "Document",
      id,
      after.organizationId,
      correlationId,
      { status: before.status, documentTypeId: before.documentTypeId },
      { status: after.status, documentTypeId: after.documentTypeId },
    );
    return after;
  }

  async listAuditLog(
    targetType: DocumentsAuditTargetType,
    targetId: string,
  ): Promise<DocumentsAuditRecord[]> {
    return this.auditLog
      .filter((entry) => entry.targetType === targetType && entry.targetId === targetId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  async findVersionById(id: string): Promise<DocumentVersion | null> {
    return this.versions.get(id) ?? null;
  }

  async findCurrentVersion(documentId: string): Promise<DocumentVersion | null> {
    return (
      [...this.versions.values()].find(
        (version) => version.documentId === documentId && version.status === "CURRENT",
      ) ?? null
    );
  }

  async listVersions(documentId: string): Promise<DocumentVersion[]> {
    return [...this.versions.values()]
      .filter((version) => version.documentId === documentId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async findCurrentVersionsByDocumentIds(
    documentIds: readonly string[],
  ): Promise<DocumentVersion[]> {
    return [...this.versions.values()].filter(
      (version) => documentIds.includes(version.documentId) && version.status === "CURRENT",
    );
  }

  async listRecent(organizationId: string, limit: number): Promise<Document[]> {
    return (await this.list(organizationId)).slice(0, limit);
  }

  async countByCategory(organizationId: string): Promise<DocumentsByCategoryEntry[]> {
    void organizationId;
    return [];
  }
}

export class FakeDocumentVerificationRepository implements DocumentVerificationRepository {
  verifications = new Map<string, DocumentVerification>();
  auditLog: DocumentsAuditRecord[] = [];

  async findById(id: string): Promise<DocumentVerification | null> {
    return this.verifications.get(id) ?? null;
  }

  async findLatestByDocumentVersionId(
    documentVersionId: string,
  ): Promise<DocumentVerification | null> {
    return (
      [...this.verifications.values()]
        .filter((verification) => verification.documentVersionId === documentVersionId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
    );
  }

  async findLatestByDocumentVersionIds(
    documentVersionIds: readonly string[],
  ): Promise<DocumentVerification[]> {
    const results: DocumentVerification[] = [];
    for (const versionId of documentVersionIds) {
      const latest = await this.findLatestByDocumentVersionId(versionId);
      if (latest) results.push(latest);
    }
    return results;
  }

  async listByOrganization(
    organizationId: string,
    filter?: ListDocumentVerificationsFilter,
  ): Promise<DocumentVerification[]> {
    return [...this.verifications.values()]
      .filter((verification) => verification.organizationId === organizationId)
      .filter((verification) => (filter?.status ? verification.status === filter.status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createWithAudit(
    data: CreateDocumentVerificationData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentVerification> {
    const now = new Date();
    const verification: DocumentVerification = {
      id: makeId(),
      organizationId: data.organizationId,
      documentVersionId: data.documentVersionId,
      method: data.method,
      status: "PENDING",
      verifiedByUserId: null,
      verifiedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };
    this.verifications.set(verification.id, verification);
    recordAudit(
      this.auditLog,
      actor,
      "DocumentVerificationCreated",
      "DocumentVerification",
      verification.id,
      verification.organizationId,
      correlationId,
      null,
      { status: verification.status },
    );
    return verification;
  }

  async updateStatusWithAudit(
    id: string,
    data: UpdateVerificationStatusData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentVerification> {
    const before = this.verifications.get(id)!;
    const after: DocumentVerification = {
      ...before,
      status: data.status,
      verifiedByUserId:
        data.verifiedByUserId !== undefined ? data.verifiedByUserId : before.verifiedByUserId,
      verifiedAt: data.verifiedAt !== undefined ? data.verifiedAt : before.verifiedAt,
      rejectionReason:
        data.rejectionReason !== undefined ? data.rejectionReason : before.rejectionReason,
      updatedAt: new Date(),
    };
    this.verifications.set(id, after);
    recordAudit(
      this.auditLog,
      actor,
      "DocumentVerificationStatusChanged",
      "DocumentVerification",
      id,
      after.organizationId,
      correlationId,
      { status: before.status },
      { status: after.status },
    );
    return after;
  }

  async countByStatus(organizationId: string, status: VerificationStatus): Promise<number> {
    return [...this.verifications.values()].filter(
      (verification) =>
        verification.organizationId === organizationId && verification.status === status,
    ).length;
  }
}
