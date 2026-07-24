// ============================================================================
// src/modules/telephony/domain/repositories/CallNoteRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaCallNoteRepository.
// ============================================================================

import type { CallNote } from "../entities/CallNote";
import type { TelephonyAuditActor } from "../entities/TelephonyAuditRecord";

export interface CreateCallNoteData {
  callAttemptId: string;
  authorUserId: string;
  body: string;
}

export interface CallNoteRepository {
  findById(id: string): Promise<CallNote | null>;
  listByCallAttempt(callAttemptId: string): Promise<CallNote[]>;

  /** Creates the Call Note and a "note added" Audit Record atomically. */
  createWithAudit(
    data: CreateCallNoteData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallNote>;

  /** Updates the Call Note's body and records a "note updated" Audit Record (before/after) atomically. */
  updateWithAudit(
    id: string,
    body: string,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallNote>;
}
