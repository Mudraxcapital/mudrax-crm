// ============================================================================
// src/modules/leads/application/use-cases/updateLeadNote.ts
// ============================================================================

import type { LeadNoteRepository } from "../../domain/repositories/LeadNoteRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import { LeadNoteNotFoundError } from "../../domain/errors/LeadErrors";
import type { UpdateLeadNoteInput } from "../validators/leadSchemas";
import { toLeadNoteDto, type LeadNoteDto } from "../dto/LeadNoteDto";

export interface UpdateLeadNoteCommand {
  id: string;
  input: UpdateLeadNoteInput;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

export function makeUpdateLeadNote(repository: LeadNoteRepository) {
  return async function updateLeadNote(command: UpdateLeadNoteCommand): Promise<LeadNoteDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new LeadNoteNotFoundError(id);
    }

    const updated = await repository.updateWithAudit(id, input.body, actor, correlationId);
    return toLeadNoteDto(updated);
  };
}
