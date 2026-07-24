// ============================================================================
// src/modules/telephony/application/dto/CallNoteDto.ts
// ============================================================================

import type { CallNote } from "../../domain/entities/CallNote";

export interface CallNoteDto {
  id: string;
  callAttemptId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function toCallNoteDto(note: CallNote): CallNoteDto {
  return {
    id: note.id,
    callAttemptId: note.callAttemptId,
    authorUserId: note.authorUserId,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}
