// ============================================================================
// src/modules/telephony/application/use-cases/listCallNotes.ts
// ============================================================================

import type { CallNoteRepository } from "../../domain/repositories/CallNoteRepository";
import { toCallNoteDto, type CallNoteDto } from "../dto/CallNoteDto";

export function makeListCallNotes(repository: CallNoteRepository) {
  return async function listCallNotes(callAttemptId: string): Promise<CallNoteDto[]> {
    const notes = await repository.listByCallAttempt(callAttemptId);
    return notes.map(toCallNoteDto);
  };
}
