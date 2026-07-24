// ============================================================================
// src/modules/documents/application/dto/DocumentCategoryDto.ts
// ============================================================================

import type { DocumentCategory } from "../../domain/entities/DocumentCategory";

export interface DocumentCategoryDto {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toDocumentCategoryDto(category: DocumentCategory): DocumentCategoryDto {
  return {
    id: category.id,
    organizationId: category.organizationId,
    name: category.name,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
