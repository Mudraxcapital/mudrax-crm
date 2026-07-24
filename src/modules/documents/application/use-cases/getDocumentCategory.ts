// ============================================================================
// src/modules/documents/application/use-cases/getDocumentCategory.ts
//
// Read-only lookups for the Document Category catalog.
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import { DocumentCategoryNotFoundError } from "../../domain/errors/DocumentErrors";
import { toDocumentCategoryDto, type DocumentCategoryDto } from "../dto/DocumentCategoryDto";

export function makeGetDocumentCategory(repository: DocumentCategoryRepository) {
  return async function getDocumentCategory(id: string): Promise<DocumentCategoryDto> {
    const category = await repository.findById(id);
    if (!category) {
      throw new DocumentCategoryNotFoundError(id);
    }
    return toDocumentCategoryDto(category);
  };
}

export function makeListDocumentCategories(repository: DocumentCategoryRepository) {
  return async function listDocumentCategories(
    organizationId: string,
  ): Promise<DocumentCategoryDto[]> {
    const categories = await repository.list(organizationId);
    return categories.map(toDocumentCategoryDto);
  };
}
