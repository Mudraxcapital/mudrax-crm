// ============================================================================
// src/modules/documents/application/use-cases/createDocumentCategory.ts
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import { DuplicateDocumentCategoryNameError } from "../../domain/errors/DocumentErrors";
import type { CreateDocumentCategoryInput } from "../validators/documentSchemas";
import { toDocumentCategoryDto, type DocumentCategoryDto } from "../dto/DocumentCategoryDto";

export interface CreateDocumentCategoryCommand {
  organizationId: string;
  input: CreateDocumentCategoryInput;
  actor: DocumentsAuditActor;
  correlationId?: string | null;
}

export function makeCreateDocumentCategory(repository: DocumentCategoryRepository) {
  return async function createDocumentCategory(
    command: CreateDocumentCategoryCommand,
  ): Promise<DocumentCategoryDto> {
    const { organizationId, input, actor, correlationId } = command;

    const existing = await repository.findByName(organizationId, input.name);
    if (existing) {
      throw new DuplicateDocumentCategoryNameError(input.name);
    }

    const created = await repository.createWithAudit(
      { organizationId, name: input.name },
      actor,
      correlationId,
    );

    return toDocumentCategoryDto(created);
  };
}
