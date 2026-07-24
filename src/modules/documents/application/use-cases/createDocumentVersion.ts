// ============================================================================
// src/modules/documents/application/use-cases/createDocumentVersion.ts
//
// The re-upload write path. A Document Version is write-once (ADR 0007), so
// correcting a rejected or illegible document means appending a new
// revision, never editing the existing one: the prior CURRENT Version is
// marked SUPERSEDED and kept, preserving the full lineage for audit.
//
// The new revision opens its own PENDING MANUAL verification, so a
// previously REJECTED document returns to the reviewer's queue rather than
// inheriting either the old rejection or an unearned approval.
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import type { DocumentTypeRepository } from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentVerificationRepository } from "../../domain/repositories/DocumentVerificationRepository";
import type { StorageLocationRepository } from "../../domain/repositories/StorageLocationRepository";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import { DocumentNotFoundError } from "../../domain/errors/DocumentErrors";
import type { DocumentStoragePort } from "../ports/DocumentStoragePort";
import type { CreateDocumentVersionInput } from "../validators/documentSchemas";
import { toDocumentDto, type DocumentDto } from "../dto/DocumentDto";
import { loadDocumentCatalogLookups } from "./documentLookups";
import { storeDocumentFile } from "./storeDocumentFile";

export interface CreateDocumentVersionCommand {
  documentId: string;
  userId: string;
  input: CreateDocumentVersionInput;
  actor: DocumentsAuditActor;
  correlationId?: string | null;
}

export function makeCreateDocumentVersion(
  repository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
  storageLocationRepository: StorageLocationRepository,
  storage: DocumentStoragePort,
) {
  return async function createDocumentVersion(
    command: CreateDocumentVersionCommand,
  ): Promise<DocumentDto> {
    const { documentId, userId, input, actor, correlationId } = command;

    const existing = await repository.findById(documentId);
    if (!existing) {
      throw new DocumentNotFoundError(documentId);
    }

    const storageLocation = await storageLocationRepository.getOrCreateDefaultLocal(
      existing.organizationId,
    );
    const attachment = await storeDocumentFile(storage, storageLocation, {
      organizationId: existing.organizationId,
      ownerType: existing.ownerType,
      ownerId: existing.ownerId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      contentBase64: input.contentBase64,
    });

    const { document, currentVersion } = await repository.addVersionWithAudit(
      { documentId, uploadedByUserId: userId, attachment },
      actor,
      correlationId,
    );

    const verification = await verificationRepository.createWithAudit(
      {
        organizationId: document.organizationId,
        documentVersionId: currentVersion.id,
        method: "MANUAL",
      },
      actor,
      correlationId,
    );

    const catalogs = await loadDocumentCatalogLookups(
      documentTypeRepository,
      documentCategoryRepository,
      document.organizationId,
    );

    return toDocumentDto(document, {
      ...catalogs,
      currentVersionByDocumentId: new Map([[document.id, currentVersion]]),
      latestVerificationByDocumentVersionId: new Map([[currentVersion.id, verification]]),
    });
  };
}
