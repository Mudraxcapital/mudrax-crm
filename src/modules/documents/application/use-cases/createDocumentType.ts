// ============================================================================
// src/modules/documents/application/use-cases/createDocumentType.ts
//
// A Document Type is meaningless without its Category, so the Category is
// validated against the same Organization before the write — a cross-tenant
// `documentCategoryId` would otherwise pass Zod's uuid check and be
// persisted by the foreign key.
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentTypeRepository } from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import {
  DocumentCategoryNotFoundError,
  DuplicateDocumentTypeNameError,
} from "../../domain/errors/DocumentErrors";
import type { CreateDocumentTypeInput } from "../validators/documentSchemas";
import { toDocumentTypeDto, type DocumentTypeDto } from "../dto/DocumentTypeDto";

export interface CreateDocumentTypeCommand {
  organizationId: string;
  input: CreateDocumentTypeInput;
  actor: DocumentsAuditActor;
  correlationId?: string | null;
}

export function makeCreateDocumentType(
  repository: DocumentTypeRepository,
  categoryRepository: DocumentCategoryRepository,
) {
  return async function createDocumentType(
    command: CreateDocumentTypeCommand,
  ): Promise<DocumentTypeDto> {
    const { organizationId, input, actor, correlationId } = command;

    const category = await categoryRepository.findById(input.documentCategoryId);
    if (!category || category.organizationId !== organizationId) {
      throw new DocumentCategoryNotFoundError(input.documentCategoryId);
    }

    const existing = await repository.findByName(organizationId, input.name);
    if (existing) {
      throw new DuplicateDocumentTypeNameError(input.name);
    }

    const created = await repository.createWithAudit(
      { organizationId, documentCategoryId: input.documentCategoryId, name: input.name },
      actor,
      correlationId,
    );

    return toDocumentTypeDto(created, new Map([[category.id, category]]));
  };
}
