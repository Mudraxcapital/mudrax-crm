// ============================================================================
// src/modules/telephony/application/use-cases/updateCallRecording.ts
// ============================================================================

import type { CallRecordingRepository } from "../../domain/repositories/CallRecordingRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import { CallRecordingNotFoundError } from "../../domain/errors/TelephonyErrors";
import type { UpdateCallRecordingInput } from "../validators/telephonySchemas";
import { toCallRecordingDto, type CallRecordingDto } from "../dto/CallRecordingDto";

export interface UpdateCallRecordingCommand {
  id: string;
  input: UpdateCallRecordingInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeUpdateCallRecording(repository: CallRecordingRepository) {
  return async function updateCallRecording(
    command: UpdateCallRecordingCommand,
  ): Promise<CallRecordingDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new CallRecordingNotFoundError(id);
    }

    const updated = await repository.updateWithAudit(
      id,
      {
        durationSeconds: input.durationSeconds,
        endedAt: input.endedAt,
        providerMetadata: input.providerMetadata,
      },
      actor,
      correlationId,
    );

    return toCallRecordingDto(updated);
  };
}
