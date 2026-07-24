// ============================================================================
// src/modules/documents/application/use-cases/getDocument.ts
//
// Read-only lookups for the Document aggregate — the document library, the
// per-Customer and per-Lead document tabs, and a Document's own revision
// history.
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type {
  DocumentRepository,
  ListDocumentsFilter,
} from "../../domain/repositories/DocumentRepository";
import type { DocumentTypeRepository } from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentVerificationRepository } from "../../domain/repositories/DocumentVerificationRepository";
import { DocumentNotFoundError } from "../../domain/errors/DocumentErrors";
import { toDocumentDto, type DocumentDto } from "../dto/DocumentDto";
import { toDocumentVersionDto, type DocumentVersionDto } from "../dto/DocumentVersionDto";
import { loadDocumentLookups } from "./documentLookups";

export function makeGetDocument(
  repository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
) {
  return async function getDocument(id: string): Promise<DocumentDto> {
    const document = await repository.findById(id);
    if (!document) {
      throw new DocumentNotFoundError(id);
    }

    const lookups = await loadDocumentLookups(
      repository,
      documentTypeRepository,
      documentCategoryRepository,
      verificationRepository,
      document.organizationId,
      [document],
    );

    return toDocumentDto(document, lookups);
  };
}

export function makeListDocuments(
  repository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
) {
  return async function listDocuments(
    organizationId: string,
    filter?: ListDocumentsFilter,
  ): Promise<DocumentDto[]> {
    const documents = await repository.list(organizationId, filter);
    const lookups = await loadDocumentLookups(
      repository,
      documentTypeRepository,
      documentCategoryRepository,
      verificationRepository,
      organizationId,
      documents,
    );

    return documents.map((document) => toDocumentDto(document, lookups));
  };
}

export function makeListDocumentsByCustomer(
  repository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
) {
  return async function listDocumentsByCustomer(customerId: string): Promise<DocumentDto[]> {
    const documents = await repository.listByOwner("CUSTOMER", customerId);
    if (documents.length === 0) return [];

    const lookups = await loadDocumentLookups(
      repository,
      documentTypeRepository,
      documentCategoryRepository,
      verificationRepository,
      documents[0]!.organizationId,
      documents,
    );

    return documents.map((document) => toDocumentDto(document, lookups));
  };
}

export function makeListDocumentsByLead(
  repository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
) {
  return async function listDocumentsByLead(leadId: string): Promise<DocumentDto[]> {
    const documents = await repository.listByOwner("LEAD", leadId);
    if (documents.length === 0) return [];

    const lookups = await loadDocumentLookups(
      repository,
      documentTypeRepository,
      documentCategoryRepository,
      verificationRepository,
      documents[0]!.organizationId,
      documents,
    );

    return documents.map((document) => toDocumentDto(document, lookups));
  };
}

/** A Document's full revision lineage, newest revision first — every Version ever created is retained (ADR 0007). */
export function makeListDocumentVersions(repository: DocumentRepository) {
  return async function listDocumentVersions(documentId: string): Promise<DocumentVersionDto[]> {
    const document = await repository.findById(documentId);
    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    const versions = await repository.listVersions(documentId);
    return versions.map(toDocumentVersionDto);
  };
}

export function makeCountDocuments(repository: DocumentRepository) {
  return async function countDocuments(
    organizationId: string,
    filter?: ListDocumentsFilter,
  ): Promise<number> {
    return repository.count(organizationId, filter);
  };
}
