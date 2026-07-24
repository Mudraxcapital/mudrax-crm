// ============================================================================
// src/modules/documents/application/use-cases/updateDocumentCategory.ts
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import {
  DocumentCategoryNotFoundError,
  DuplicateDocumentCategoryNameError,
} from "../../domain/errors/DocumentErrors";
import type { UpdateDocumentCategoryInput } from "../validators/documentSchemas";
import { toDocumentCategoryDto, type DocumentCategoryDto } from "../dto/DocumentCategoryDto";

export interface UpdateDocumentCategoryCommand {
  id: string;
  input: UpdateDocumentCategoryInput;
  actor: DocumentsAuditActor;
  correlationId?: string | null;
}

export function makeUpdateDocumentCategory(repository: DocumentCategoryRepository) {
  return async function updateDocumentCategory(
    command: UpdateDocumentCategoryCommand,
  ): Promise<DocumentCategoryDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new DocumentCategoryNotFoundError(id);
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await repository.findByName(existing.organizationId, input.name);
      if (duplicate) {
        throw new DuplicateDocumentCategoryNameError(input.name);
      }
    }

    const updated = await repository.updateWithAudit(
      id,
      { name: input.name, isActive: input.isActive },
      actor,
      correlationId,
    );

    return toDocumentCategoryDto(updated);
  };
}
