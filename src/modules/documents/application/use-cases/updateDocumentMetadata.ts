// ============================================================================
// src/modules/documents/application/use-cases/updateDocumentMetadata.ts
//
// Re-classification only: a Document may be moved to a different Document
// Type when it was filed under the wrong one. The version lineage and the
// stored bytes are never touched here — correcting the *file* is
// createDocumentVersion's job, and the Document's workflow status is
// derived from verification decisions, not set by hand.
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import type { DocumentTypeRepository } from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentVerificationRepository } from "../../domain/repositories/DocumentVerificationRepository";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import {
  DocumentNotFoundError,
  InvalidDocumentTypeReferenceError,
} from "../../domain/errors/DocumentErrors";
import type { UpdateDocumentMetadataInput } from "../validators/documentSchemas";
import { toDocumentDto, type DocumentDto } from "../dto/DocumentDto";
import { loadDocumentLookups } from "./documentLookups";

export interface UpdateDocumentMetadataCommand {
  id: string;
  input: UpdateDocumentMetadataInput;
  actor: DocumentsAuditActor;
  correlationId?: string | null;
}

export function makeUpdateDocumentMetadata(
  repository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
) {
  return async function updateDocumentMetadata(
    command: UpdateDocumentMetadataCommand,
  ): Promise<DocumentDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new DocumentNotFoundError(id);
    }

    if (input.documentTypeId && input.documentTypeId !== existing.documentTypeId) {
      const documentType = await documentTypeRepository.findById(input.documentTypeId);
      if (!documentType || documentType.organizationId !== existing.organizationId) {
        throw new InvalidDocumentTypeReferenceError(input.documentTypeId);
      }
    }

    const updated = await repository.updateMetadataWithAudit(
      id,
      { documentTypeId: input.documentTypeId },
      actor,
      correlationId,
    );

    const lookups = await loadDocumentLookups(
      repository,
      documentTypeRepository,
      documentCategoryRepository,
      verificationRepository,
      updated.organizationId,
      [updated],
    );

    return toDocumentDto(updated, lookups);
  };
}
