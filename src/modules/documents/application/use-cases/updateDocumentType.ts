// ============================================================================
// src/modules/documents/application/use-cases/updateDocumentType.ts
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentTypeRepository } from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import {
  DocumentCategoryNotFoundError,
  DocumentTypeNotFoundError,
  DuplicateDocumentTypeNameError,
} from "../../domain/errors/DocumentErrors";
import type { UpdateDocumentTypeInput } from "../validators/documentSchemas";
import { toDocumentTypeDto, type DocumentTypeDto } from "../dto/DocumentTypeDto";

export interface UpdateDocumentTypeCommand {
  id: string;
  input: UpdateDocumentTypeInput;
  actor: DocumentsAuditActor;
  correlationId?: string | null;
}

export function makeUpdateDocumentType(
  repository: DocumentTypeRepository,
  categoryRepository: DocumentCategoryRepository,
) {
  return async function updateDocumentType(
    command: UpdateDocumentTypeCommand,
  ): Promise<DocumentTypeDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new DocumentTypeNotFoundError(id);
    }

    const targetCategoryId = input.documentCategoryId ?? existing.documentCategoryId;
    const category = await categoryRepository.findById(targetCategoryId);
    if (!category || category.organizationId !== existing.organizationId) {
      throw new DocumentCategoryNotFoundError(targetCategoryId);
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await repository.findByName(existing.organizationId, input.name);
      if (duplicate) {
        throw new DuplicateDocumentTypeNameError(input.name);
      }
    }

    const updated = await repository.updateWithAudit(
      id,
      {
        documentCategoryId: input.documentCategoryId,
        name: input.name,
        isActive: input.isActive,
      },
      actor,
      correlationId,
    );

    return toDocumentTypeDto(updated, new Map([[category.id, category]]));
  };
}
