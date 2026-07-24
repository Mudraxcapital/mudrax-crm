// ============================================================================
// src/modules/documents/application/use-cases/getDocumentsDashboard.ts
//
// The basic Documents Dashboard this task requires: Total Documents,
// Documents by Category, Pending Verification, Recently Uploaded (mirrors
// telephony's getTelephonyDashboard.ts aggregation-use-case pattern).
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import type { DocumentTypeRepository } from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentVerificationRepository } from "../../domain/repositories/DocumentVerificationRepository";
import { toDocumentDto } from "../dto/DocumentDto";
import type { DocumentsByCategoryDto, DocumentsDashboardDto } from "../dto/DocumentsDashboardDto";
import { loadDocumentLookups } from "./documentLookups";

const RECENTLY_UPLOADED_LIMIT = 10;

export function makeGetDocumentsDashboard(
  repository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
) {
  return async function getDocumentsDashboard(
    organizationId: string,
  ): Promise<DocumentsDashboardDto> {
    const [totalDocuments, byCategory, pendingVerification, recentDocuments] = await Promise.all([
      repository.count(organizationId),
      repository.countByCategory(organizationId),
      verificationRepository.countByStatus(organizationId, "PENDING"),
      repository.listRecent(organizationId, RECENTLY_UPLOADED_LIMIT),
    ]);

    const lookups = await loadDocumentLookups(
      repository,
      documentTypeRepository,
      documentCategoryRepository,
      verificationRepository,
      organizationId,
      recentDocuments,
    );

    const documentsByCategory: DocumentsByCategoryDto[] = byCategory.map((entry) => ({
      categoryId: entry.documentCategoryId,
      categoryName: entry.categoryName,
      count: entry.count,
    }));

    return {
      totalDocuments,
      documentsByCategory,
      pendingVerification,
      recentlyUploaded: recentDocuments.map((document) => toDocumentDto(document, lookups)),
    };
  };
}
