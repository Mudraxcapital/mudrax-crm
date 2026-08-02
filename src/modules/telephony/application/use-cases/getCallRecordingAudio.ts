// ============================================================================
// Loads Call Recording audio bytes for authorized playback.
// ============================================================================

import type { CallAttemptRepository } from "../../domain/repositories/CallAttemptRepository";
import type { CallRecordingRepository } from "../../domain/repositories/CallRecordingRepository";
import {
  CallAttemptNotFoundError,
  CallRecordingNotFoundError,
} from "../../domain/errors/TelephonyErrors";
import {
  guessRecordingContentType,
  isServerStoredRecordingReference,
  storageKeyFromRecordingReference,
} from "../../domain/recordingStorage";
import type { RecordingStoragePort } from "../ports/RecordingStoragePort";

export class CallRecordingAudioNotAvailableError extends Error {
  constructor(recordingId: string) {
    super(
      `Call Recording ${recordingId} has no server-stored audio (still on the caller's phone only).`,
    );
    this.name = "CallRecordingAudioNotAvailableError";
  }
}

export interface GetCallRecordingAudioResult {
  content: Buffer;
  contentType: string;
  fileName: string;
}

export function makeGetCallRecordingAudio(
  callAttemptRepository: CallAttemptRepository,
  recordingRepository: CallRecordingRepository,
  storage: RecordingStoragePort,
) {
  return async function getCallRecordingAudio(input: {
    callAttemptId: string;
    recordingId: string;
    organizationId: string;
  }): Promise<GetCallRecordingAudioResult> {
    const call = await callAttemptRepository.findById(input.callAttemptId);
    if (!call || call.organizationId !== input.organizationId) {
      throw new CallAttemptNotFoundError(input.callAttemptId);
    }

    const recording = await recordingRepository.findById(input.recordingId);
    if (!recording || recording.callAttemptId !== input.callAttemptId) {
      throw new CallRecordingNotFoundError(input.recordingId);
    }

    if (!isServerStoredRecordingReference(recording.storageReference)) {
      throw new CallRecordingAudioNotAvailableError(input.recordingId);
    }

    const storageKey = storageKeyFromRecordingReference(recording.storageReference);
    if (!storageKey || !(await storage.exists(storageKey))) {
      throw new CallRecordingAudioNotAvailableError(input.recordingId);
    }

    const content = await storage.retrieve(storageKey);
    const fileName = storageKey.split("/").pop() || `${input.recordingId}.m4a`;
    const metaType =
      recording.providerMetadata &&
      typeof recording.providerMetadata === "object" &&
      typeof (recording.providerMetadata as { contentType?: unknown }).contentType === "string"
        ? ((recording.providerMetadata as { contentType: string }).contentType)
        : null;

    return {
      content,
      contentType: metaType || guessRecordingContentType(fileName),
      fileName,
    };
  };
}
