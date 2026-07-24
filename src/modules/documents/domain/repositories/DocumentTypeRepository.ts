// ============================================================================
// src/modules/documents/domain/repositories/DocumentTypeRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaDocumentTypeRepository.
// ============================================================================

import type { DocumentType } from "../entities/DocumentType";
import type { DocumentsAuditActor } from "../entities/DocumentsAuditRecord";

export interface CreateDocumentTypeData {
  organizationId: string;
  documentCategoryId: string;
  name: string;
}

export interface UpdateDocumentTypeData {
  documentCategoryId?: string;
  name?: string;
  isActive?: boolean;
}

export interface ListDocumentTypesFilter {
  documentCategoryId?: string;
}

export interface DocumentTypeRepository {
  findById(id: string): Promise<DocumentType | null>;
  findByName(organizationId: string, name: string): Promise<DocumentType | null>;
  list(organizationId: string, filter?: ListDocumentTypesFilter): Promise<DocumentType[]>;

  /** Creates the Document Type and a "created" Audit Record atomically. */
  createWithAudit(
    data: CreateDocumentTypeData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentType>;

  /** Updates the Document Type and records an "updated" Audit Record (before/after) atomically. */
  updateWithAudit(
    id: string,
    data: UpdateDocumentTypeData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentType>;
}
