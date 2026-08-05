// ============================================================================
// src/modules/leads/domain/repositories/LeadNoteRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaLeadNoteRepository.
// ============================================================================

import type { LeadNote } from "../entities/LeadNote";
import type { LeadAuditActor } from "../entities/LeadAuditRecord";

export interface CreateLeadNoteData {
  leadId: string;
  authorUserId: string;
  body: string;
}

export interface LeadNoteRepository {
  findById(id: string): Promise<LeadNote | null>;
  listByLead(leadId: string): Promise<LeadNote[]>;
  /**
   * Latest note body per lead (one round-trip). Missing leads are omitted.
   * Order among ties: newest `createdAt` wins.
   */
  listLatestBodyByLeadIds(leadIds: string[]): Promise<Map<string, string | null>>;

  /** Creates the Lead Note and a "note added" Audit Record atomically. */
  createWithAudit(
    data: CreateLeadNoteData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadNote>;

  /** Updates the Lead Note's body and records a "note updated" Audit Record (before/after) atomically. */
  updateWithAudit(
    id: string,
    body: string,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadNote>;
}
