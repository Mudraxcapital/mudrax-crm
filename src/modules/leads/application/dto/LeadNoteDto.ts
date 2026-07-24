// ============================================================================
// src/modules/leads/application/dto/LeadNoteDto.ts
// ============================================================================

import type { LeadNote } from "../../domain/entities/LeadNote";

export interface LeadNoteDto {
  id: string;
  leadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

export function toLeadNoteDto(note: LeadNote): LeadNoteDto {
  return {
    id: note.id,
    leadId: note.leadId,
    authorUserId: note.authorUserId,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
  };
}
