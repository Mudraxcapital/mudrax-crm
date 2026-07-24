// ============================================================================
// src/modules/documents/application/dto/DocumentsDashboardDto.ts
//
// The basic Documents Dashboard this task requires: Total Documents,
// Documents by Category, Pending Verification, Recently Uploaded.
// ============================================================================

import type { DocumentDto } from "./DocumentDto";

export interface DocumentsByCategoryDto {
  categoryId: string;
  categoryName: string;
  count: number;
}

export interface DocumentsDashboardDto {
  totalDocuments: number;
  documentsByCategory: DocumentsByCategoryDto[];
  pendingVerification: number;
  recentlyUploaded: DocumentDto[];
}
