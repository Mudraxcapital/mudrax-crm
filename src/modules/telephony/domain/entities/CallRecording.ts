// ============================================================================
// src/modules/telephony/domain/entities/CallRecording.ts
//
// Child entity of Call Attempt for metadata and an access-audit trail; the
// audio payload is always an external reference, never inlined (ADR 0006).
// Per this task's scope, only file reference, duration, timestamps, and
// opaque provider metadata are stored — the AI annotation seams
// (transcriptRef/summaryRef/qualityScoreRef) exist in the schema for a
// future capability but are out of scope here.
// ============================================================================

export interface CallRecording {
  id: string;
  callAttemptId: string;
  storageReference: string;
  durationSeconds: number | null;
  providerMetadata: Record<string, unknown> | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
}
