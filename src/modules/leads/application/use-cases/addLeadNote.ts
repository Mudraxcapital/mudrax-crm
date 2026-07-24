// ============================================================================
// src/modules/leads/application/use-cases/addLeadNote.ts
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadNoteRepository } from "../../domain/repositories/LeadNoteRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import { LeadNotFoundError } from "../../domain/errors/LeadErrors";
import type { CreateLeadNoteInput } from "../validators/leadSchemas";
import { toLeadNoteDto, type LeadNoteDto } from "../dto/LeadNoteDto";

export interface AddLeadNoteCommand {
  leadId: string;
  authorUserId: string;
  input: CreateLeadNoteInput;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

export function makeAddLeadNote(
  leadRepository: LeadRepository,
  noteRepository: LeadNoteRepository,
) {
  return async function addLeadNote(command: AddLeadNoteCommand): Promise<LeadNoteDto> {
    const { leadId, authorUserId, input, actor, correlationId } = command;

    const lead = await leadRepository.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundError(leadId);
    }

    const note = await noteRepository.createWithAudit(
      { leadId, authorUserId, body: input.body },
      actor,
      correlationId,
    );

    return toLeadNoteDto(note);
  };
}
