// ============================================================================
// src/modules/telephony/application/use-cases/createCallRecording.ts
//
// Logs Recording Metadata for a Call Attempt: file reference, duration,
// timestamps and opaque provider metadata only (docs/modules/telephony.md
// — "Recording metadata should store file reference, duration, timestamps
// and provider metadata only"). The audio payload itself is never handled
// here (ADR 0006).
// ============================================================================

import type { CallAttemptRepository } from "../../domain/repositories/CallAttemptRepository";
import type { CallRecordingRepository } from "../../domain/repositories/CallRecordingRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import { CallAttemptNotFoundError } from "../../domain/errors/TelephonyErrors";
import type { CreateCallRecordingInput } from "../validators/telephonySchemas";
import { toCallRecordingDto, type CallRecordingDto } from "../dto/CallRecordingDto";

export interface CreateCallRecordingCommand {
  input: CreateCallRecordingInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeCreateCallRecording(
  callAttemptRepository: CallAttemptRepository,
  recordingRepository: CallRecordingRepository,
) {
  return async function createCallRecording(
    command: CreateCallRecordingCommand,
  ): Promise<CallRecordingDto> {
    const { input, actor, correlationId } = command;

    const call = await callAttemptRepository.findById(input.callAttemptId);
    if (!call) {
      throw new CallAttemptNotFoundError(input.callAttemptId);
    }

    const recording = await recordingRepository.createWithAudit(
      {
        callAttemptId: input.callAttemptId,
        storageReference: input.storageReference,
        durationSeconds: input.durationSeconds ?? null,
        providerMetadata: input.providerMetadata ?? null,
        startedAt: input.startedAt,
        endedAt: input.endedAt ?? null,
      },
      actor,
      correlationId,
    );

    return toCallRecordingDto(recording);
  };
}
