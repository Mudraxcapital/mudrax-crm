// ============================================================================
// src/modules/telephony/domain/repositories/CallRecordingRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaCallRecordingRepository.
// ============================================================================

import type { CallRecording } from "../entities/CallRecording";
import type { TelephonyAuditActor, TelephonyAuditRecord } from "../entities/TelephonyAuditRecord";

export interface CreateCallRecordingData {
  callAttemptId: string;
  storageReference: string;
  durationSeconds?: number | null;
  providerMetadata?: Record<string, unknown> | null;
  startedAt: Date;
  endedAt?: Date | null;
}

export interface UpdateCallRecordingData {
  durationSeconds?: number | null;
  endedAt?: Date | null;
  providerMetadata?: Record<string, unknown> | null;
}

export interface CallRecordingRepository {
  findById(id: string): Promise<CallRecording | null>;
  listByCallAttempt(callAttemptId: string): Promise<CallRecording[]>;

  /** Creates the Call Recording metadata row and a "recorded" Audit Record atomically — the audio payload itself is always an external reference (ADR 0006), never handled here. */
  createWithAudit(
    data: CreateCallRecordingData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallRecording>;

  /** Updates the Call Recording's metadata (duration/endedAt/provider metadata only) and records an "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateCallRecordingData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallRecording>;

  listAuditLog(callRecordingId: string): Promise<TelephonyAuditRecord[]>;
}
