// ============================================================================
// src/modules/leads/application/use-cases/listLeadNotes.ts
// ============================================================================

import type { LeadNoteRepository } from "../../domain/repositories/LeadNoteRepository";
import { toLeadNoteDto, type LeadNoteDto } from "../dto/LeadNoteDto";

export function makeListLeadNotes(repository: LeadNoteRepository) {
  return async function listLeadNotes(leadId: string): Promise<LeadNoteDto[]> {
    const notes = await repository.listByLead(leadId);
    return notes.map(toLeadNoteDto);
  };
}

/** Latest note body per lead id — single batched repository call. */
export function makeListLatestLeadNoteBodies(repository: LeadNoteRepository) {
  return async function listLatestLeadNoteBodies(
    leadIds: string[],
  ): Promise<Map<string, string | null>> {
    return repository.listLatestBodyByLeadIds(leadIds);
  };
}
