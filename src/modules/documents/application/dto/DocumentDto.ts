// ============================================================================
// src/modules/documents/application/dto/DocumentDto.ts
//
// What the Document aggregate's use-cases return to the presentation layer
// — a plain, serializable shape (dates as ISO strings), enriched with the
// Document Type / Document Category display names, the current revision
// number, and the pinned revision's verification state, so pages don't have
// to re-join four tables themselves (mirrors telephony's CallAttemptDto).
//
// Every enrichment is optional: `DocumentLookups` carries whatever the
// calling use-case had cheap access to, and anything absent surfaces as
// null rather than an extra query per row.
// ============================================================================

import type { Document } from "../../domain/entities/Document";
import type { DocumentCategory } from "../../domain/entities/DocumentCategory";
import type { DocumentType } from "../../domain/entities/DocumentType";
import type { DocumentVersion } from "../../domain/entities/DocumentVersion";
import type {
  DocumentVerification,
  VerificationStatus,
} from "../../domain/entities/DocumentVerification";

export interface DocumentDto {
  id: string;
  organizationId: string;
  documentTypeId: string;
  documentTypeName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  ownerType: Document["ownerType"];
  ownerId: string;
  status: Document["status"];
  currentVersionId: string | null;
  currentVersionNumber: number | null;
  latestVerificationStatus: VerificationStatus | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentLookups {
  documentTypesById: ReadonlyMap<string, DocumentType>;
  categoriesById: ReadonlyMap<string, DocumentCategory>;
  currentVersionByDocumentId?: ReadonlyMap<string, DocumentVersion>;
  latestVerificationByDocumentVersionId?: ReadonlyMap<string, DocumentVerification>;
}

export function toDocumentDto(document: Document, lookups: DocumentLookups): DocumentDto {
  const documentType = lookups.documentTypesById.get(document.documentTypeId);
  const category = documentType
    ? lookups.categoriesById.get(documentType.documentCategoryId)
    : undefined;
  const currentVersion = lookups.currentVersionByDocumentId?.get(document.id);
  const verification = currentVersion
    ? lookups.latestVerificationByDocumentVersionId?.get(currentVersion.id)
    : undefined;

  return {
    id: document.id,
    organizationId: document.organizationId,
    documentTypeId: document.documentTypeId,
    documentTypeName: documentType?.name ?? null,
    categoryId: documentType?.documentCategoryId ?? null,
    categoryName: category?.name ?? null,
    ownerType: document.ownerType,
    ownerId: document.ownerId,
    status: document.status,
    currentVersionId: currentVersion?.id ?? null,
    currentVersionNumber: currentVersion?.versionNumber ?? null,
    latestVerificationStatus: verification?.status ?? null,
    createdByUserId: document.createdByUserId,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}
