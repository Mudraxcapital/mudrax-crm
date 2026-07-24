// ============================================================================
// src/modules/documents/application/use-cases/documentLookups.ts
//
// Shared helpers: load the Document Type / Document Category catalogs for
// an Organization into lookup Maps, and resolve the current revision plus
// its verification state for a page of Documents — so no use-case
// re-implements the same joins, and no list view degrades into a query per
// row (mirrors telephony's callOutcomeLookups.ts).
// ============================================================================

import type { Document } from "../../domain/entities/Document";
import type { DocumentCategory } from "../../domain/entities/DocumentCategory";
import type { DocumentType } from "../../domain/entities/DocumentType";
import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import type { DocumentTypeRepository } from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentVerificationRepository } from "../../domain/repositories/DocumentVerificationRepository";
import type { DocumentLookups } from "../dto/DocumentDto";

export interface DocumentCatalogLookups {
  documentTypesById: ReadonlyMap<string, DocumentType>;
  categoriesById: ReadonlyMap<string, DocumentCategory>;
}

export async function loadDocumentCatalogLookups(
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  organizationId: string,
): Promise<DocumentCatalogLookups> {
  const [documentTypes, categories] = await Promise.all([
    documentTypeRepository.list(organizationId),
    documentCategoryRepository.list(organizationId),
  ]);

  return {
    documentTypesById: new Map(
      documentTypes.map((documentType) => [documentType.id, documentType]),
    ),
    categoriesById: new Map(categories.map((category) => [category.id, category])),
  };
}

/**
 * Full enrichment set for a page of Documents: the catalogs plus each
 * Document's CURRENT revision and that revision's latest verification
 * decision, all resolved in a fixed number of queries regardless of page
 * size.
 */
export async function loadDocumentLookups(
  documentRepository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
  organizationId: string,
  documents: readonly Document[],
): Promise<DocumentLookups> {
  const catalogs = await loadDocumentCatalogLookups(
    documentTypeRepository,
    documentCategoryRepository,
    organizationId,
  );

  if (documents.length === 0) {
    return {
      ...catalogs,
      currentVersionByDocumentId: new Map(),
      latestVerificationByDocumentVersionId: new Map(),
    };
  }

  const currentVersions = await documentRepository.findCurrentVersionsByDocumentIds(
    documents.map((document) => document.id),
  );
  const verifications = await verificationRepository.findLatestByDocumentVersionIds(
    currentVersions.map((version) => version.id),
  );

  return {
    ...catalogs,
    currentVersionByDocumentId: new Map(
      currentVersions.map((version) => [version.documentId, version]),
    ),
    latestVerificationByDocumentVersionId: new Map(
      verifications.map((verification) => [verification.documentVersionId, verification]),
    ),
  };
}
