// ============================================================================
// src/modules/documents/application/use-cases/getDocumentVerification.ts
//
// Read-only lookups for the Document Verification aggregate — a single
// decision cycle, the open cycle for a Document's current revision, and the
// reviewer's pending queue.
// ============================================================================

import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import type {
  DocumentVerificationRepository,
  ListDocumentVerificationsFilter,
} from "../../domain/repositories/DocumentVerificationRepository";
import {
  DocumentNotFoundError,
  DocumentVerificationNotFoundError,
  DocumentVersionNotFoundError,
} from "../../domain/errors/DocumentErrors";
import {
  toDocumentVerificationDto,
  type DocumentVerificationDto,
} from "../dto/DocumentVerificationDto";

export function makeGetDocumentVerification(repository: DocumentVerificationRepository) {
  return async function getDocumentVerification(id: string): Promise<DocumentVerificationDto> {
    const verification = await repository.findById(id);
    if (!verification) {
      throw new DocumentVerificationNotFoundError(id);
    }
    return toDocumentVerificationDto(verification);
  };
}

/** The decision cycle pinned to a Document's current revision — what the verification form acts on. */
export function makeGetCurrentDocumentVerification(
  repository: DocumentVerificationRepository,
  documentRepository: DocumentRepository,
) {
  return async function getCurrentDocumentVerification(
    documentId: string,
  ): Promise<DocumentVerificationDto> {
    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    const version = await documentRepository.findCurrentVersion(documentId);
    if (!version) {
      throw new DocumentVersionNotFoundError(documentId);
    }

    const verification = await repository.findLatestByDocumentVersionId(version.id);
    if (!verification) {
      throw new DocumentVerificationNotFoundError(version.id);
    }

    return toDocumentVerificationDto(verification);
  };
}

/** The reviewer's queue: every still-open decision cycle in the Organization. */
export function makeListPendingVerifications(repository: DocumentVerificationRepository) {
  return async function listPendingVerifications(
    organizationId: string,
    filter?: Omit<ListDocumentVerificationsFilter, "status">,
  ): Promise<DocumentVerificationDto[]> {
    const verifications = await repository.listByOrganization(organizationId, {
      ...filter,
      status: "PENDING",
    });
    return verifications.map(toDocumentVerificationDto);
  };
}
