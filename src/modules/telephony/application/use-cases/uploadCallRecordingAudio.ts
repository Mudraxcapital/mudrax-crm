// ============================================================================
// Stores Call Recording audio bytes externally and points storageReference
// at the server key (ADR 0006 — never inline audio in the database).
// ============================================================================

import type { CallAttemptRepository } from "../../domain/repositories/CallAttemptRepository";
import type { CallRecordingRepository } from "../../domain/repositories/CallRecordingRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import {
  CallAttemptNotFoundError,
  CallRecordingNotFoundError,
} from "../../domain/errors/TelephonyErrors";
import {
  guessRecordingContentType,
  toServerRecordingReference,
} from "../../domain/recordingStorage";
import type { RecordingStoragePort } from "../ports/RecordingStoragePort";
import { toCallRecordingDto, type CallRecordingDto } from "../dto/CallRecordingDto";

export interface UploadCallRecordingAudioCommand {
  callAttemptId: string;
  recordingId: string;
  organizationId: string;
  fileName: string;
  contentType?: string;
  content: Buffer;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeUploadCallRecordingAudio(
  callAttemptRepository: CallAttemptRepository,
  recordingRepository: CallRecordingRepository,
  storage: RecordingStoragePort,
) {
  return async function uploadCallRecordingAudio(
    command: UploadCallRecordingAudioCommand,
  ): Promise<CallRecordingDto> {
    const call = await callAttemptRepository.findById(command.callAttemptId);
    if (!call || call.organizationId !== command.organizationId) {
      throw new CallAttemptNotFoundError(command.callAttemptId);
    }

    const existing = await recordingRepository.findById(command.recordingId);
    if (!existing || existing.callAttemptId !== command.callAttemptId) {
      throw new CallRecordingNotFoundError(command.recordingId);
    }

    const safeName = command.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "recording.m4a";
    const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : ".m4a";
    const relativeKey = `call-recordings/${command.organizationId}/${command.callAttemptId}/${command.recordingId}${ext}`;
    const mimeType = command.contentType || guessRecordingContentType(safeName);

    const stored = await storage.store({
      organizationId: command.organizationId,
      relativeKey,
      content: command.content,
      mimeType,
    });

    const previousMeta =
      existing.providerMetadata && typeof existing.providerMetadata === "object"
        ? existing.providerMetadata
        : {};

    const updated = await recordingRepository.updateWithAudit(
      command.recordingId,
      {
        storageReference: toServerRecordingReference(stored.storageKey),
        providerMetadata: {
          ...previousMeta,
          uploadedAt: new Date().toISOString(),
          uploadedByUserId: command.actor.actorId,
          contentType: mimeType,
          sizeBytes: stored.sizeBytes,
          checksum: stored.checksum,
          previousStorageReference: existing.storageReference,
        },
      },
      command.actor,
      command.correlationId,
    );

    return toCallRecordingDto(updated);
  };
}
