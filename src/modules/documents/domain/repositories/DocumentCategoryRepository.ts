// ============================================================================
// src/modules/documents/domain/repositories/DocumentCategoryRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaDocumentCategoryRepository.
// ============================================================================

import type { DocumentCategory } from "../entities/DocumentCategory";
import type { DocumentsAuditActor } from "../entities/DocumentsAuditRecord";

export interface CreateDocumentCategoryData {
  organizationId: string;
  name: string;
}

export interface UpdateDocumentCategoryData {
  name?: string;
  isActive?: boolean;
}

export interface DocumentCategoryRepository {
  findById(id: string): Promise<DocumentCategory | null>;
  findByName(organizationId: string, name: string): Promise<DocumentCategory | null>;
  list(organizationId: string): Promise<DocumentCategory[]>;

  /** Creates the Document Category and a "created" Audit Record atomically. */
  createWithAudit(
    data: CreateDocumentCategoryData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentCategory>;

  /** Updates the Document Category and records an "updated" Audit Record (before/after) atomically. */
  updateWithAudit(
    id: string,
    data: UpdateDocumentCategoryData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentCategory>;
}
