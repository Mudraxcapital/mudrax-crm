// ============================================================================
// src/modules/telephony/application/use-cases/getCallRecording.ts
// ============================================================================

import type { CallRecordingRepository } from "../../domain/repositories/CallRecordingRepository";
import { CallRecordingNotFoundError } from "../../domain/errors/TelephonyErrors";
import { toCallRecordingDto, type CallRecordingDto } from "../dto/CallRecordingDto";

export function makeGetCallRecording(repository: CallRecordingRepository) {
  return async function getCallRecording(id: string): Promise<CallRecordingDto> {
    const recording = await repository.findById(id);
    if (!recording) {
      throw new CallRecordingNotFoundError(id);
    }
    return toCallRecordingDto(recording);
  };
}

export function makeListCallRecordings(repository: CallRecordingRepository) {
  return async function listCallRecordings(callAttemptId: string): Promise<CallRecordingDto[]> {
    const recordings = await repository.listByCallAttempt(callAttemptId);
    return recordings.map(toCallRecordingDto);
  };
}
