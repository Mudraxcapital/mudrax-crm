// ============================================================================
// src/modules/telephony/application/use-cases/addCallNote.ts
// ============================================================================

import type { CallAttemptRepository } from "../../domain/repositories/CallAttemptRepository";
import type { CallNoteRepository } from "../../domain/repositories/CallNoteRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import { CallAttemptNotFoundError } from "../../domain/errors/TelephonyErrors";
import type { CreateCallNoteInput } from "../validators/telephonySchemas";
import { toCallNoteDto, type CallNoteDto } from "../dto/CallNoteDto";

export interface AddCallNoteCommand {
  callAttemptId: string;
  authorUserId: string;
  input: CreateCallNoteInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeAddCallNote(
  callAttemptRepository: CallAttemptRepository,
  noteRepository: CallNoteRepository,
) {
  return async function addCallNote(command: AddCallNoteCommand): Promise<CallNoteDto> {
    const { callAttemptId, authorUserId, input, actor, correlationId } = command;

    const call = await callAttemptRepository.findById(callAttemptId);
    if (!call) {
      throw new CallAttemptNotFoundError(callAttemptId);
    }

    const note = await noteRepository.createWithAudit(
      { callAttemptId, authorUserId, body: input.body },
      actor,
      correlationId,
    );

    return toCallNoteDto(note);
  };
}
