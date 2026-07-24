// ============================================================================
// src/modules/telephony/application/use-cases/updateCallNote.ts
// ============================================================================

import type { CallNoteRepository } from "../../domain/repositories/CallNoteRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import { CallNoteNotFoundError } from "../../domain/errors/TelephonyErrors";
import type { UpdateCallNoteInput } from "../validators/telephonySchemas";
import { toCallNoteDto, type CallNoteDto } from "../dto/CallNoteDto";

export interface UpdateCallNoteCommand {
  id: string;
  input: UpdateCallNoteInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeUpdateCallNote(repository: CallNoteRepository) {
  return async function updateCallNote(command: UpdateCallNoteCommand): Promise<CallNoteDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new CallNoteNotFoundError(id);
    }

    const updated = await repository.updateWithAudit(id, input.body, actor, correlationId);
    return toCallNoteDto(updated);
  };
}
