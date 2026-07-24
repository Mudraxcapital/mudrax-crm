// ============================================================================
// src/modules/telephony/application/dto/CallRecordingDto.ts
// ============================================================================

import type { CallRecording } from "../../domain/entities/CallRecording";

export interface CallRecordingDto {
  id: string;
  callAttemptId: string;
  storageReference: string;
  durationSeconds: number | null;
  providerMetadata: Record<string, unknown> | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export function toCallRecordingDto(recording: CallRecording): CallRecordingDto {
  return {
    id: recording.id,
    callAttemptId: recording.callAttemptId,
    storageReference: recording.storageReference,
    durationSeconds: recording.durationSeconds,
    providerMetadata: recording.providerMetadata,
    startedAt: recording.startedAt.toISOString(),
    endedAt: recording.endedAt ? recording.endedAt.toISOString() : null,
    createdAt: recording.createdAt.toISOString(),
  };
}
