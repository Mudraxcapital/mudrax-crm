// ============================================================================
// src/modules/documents/application/dto/DocumentTypeDto.ts
//
// Enriched with the owning Document Category's display name so catalog
// pages don't have to re-join the catalog themselves.
// ============================================================================

import type { DocumentCategory } from "../../domain/entities/DocumentCategory";
import type { DocumentType } from "../../domain/entities/DocumentType";

export interface DocumentTypeDto {
  id: string;
  organizationId: string;
  documentCategoryId: string;
  categoryName: string | null;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toDocumentTypeDto(
  documentType: DocumentType,
  categoriesById?: ReadonlyMap<string, DocumentCategory>,
): DocumentTypeDto {
  return {
    id: documentType.id,
    organizationId: documentType.organizationId,
    documentCategoryId: documentType.documentCategoryId,
    categoryName: categoriesById?.get(documentType.documentCategoryId)?.name ?? null,
    name: documentType.name,
    isActive: documentType.isActive,
    createdAt: documentType.createdAt.toISOString(),
    updatedAt: documentType.updatedAt.toISOString(),
  };
}
