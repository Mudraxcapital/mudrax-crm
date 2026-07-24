// ============================================================================
// src/modules/documents/application/use-cases/getDocumentType.ts
//
// Read-only lookups for the Document Type catalog — including the
// by-Category filter the upload form uses to narrow its Type picker.
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type {
  DocumentTypeRepository,
  ListDocumentTypesFilter,
} from "../../domain/repositories/DocumentTypeRepository";
import { DocumentTypeNotFoundError } from "../../domain/errors/DocumentErrors";
import { toDocumentTypeDto, type DocumentTypeDto } from "../dto/DocumentTypeDto";

export function makeGetDocumentType(
  repository: DocumentTypeRepository,
  categoryRepository: DocumentCategoryRepository,
) {
  return async function getDocumentType(id: string): Promise<DocumentTypeDto> {
    const documentType = await repository.findById(id);
    if (!documentType) {
      throw new DocumentTypeNotFoundError(id);
    }

    const category = await categoryRepository.findById(documentType.documentCategoryId);
    return toDocumentTypeDto(
      documentType,
      category ? new Map([[category.id, category]]) : undefined,
    );
  };
}

export function makeListDocumentTypes(
  repository: DocumentTypeRepository,
  categoryRepository: DocumentCategoryRepository,
) {
  return async function listDocumentTypes(
    organizationId: string,
    filter?: ListDocumentTypesFilter,
  ): Promise<DocumentTypeDto[]> {
    const [documentTypes, categories] = await Promise.all([
      repository.list(organizationId, filter),
      categoryRepository.list(organizationId),
    ]);
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    return documentTypes.map((documentType) => toDocumentTypeDto(documentType, categoriesById));
  };
}
