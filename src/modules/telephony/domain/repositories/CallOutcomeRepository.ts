// ============================================================================
// src/modules/telephony/domain/repositories/CallOutcomeRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaCallOutcomeRepository. Unlike
// `leads`' read-only LeadCatalogRepository, this module exposes full
// Create/Update use-cases for Call Outcome because it is explicitly one of
// this task's nine aggregates to implement end-to-end.
// ============================================================================

import type { CallOutcome } from "../entities/CallOutcome";
import type { TelephonyAuditActor } from "../entities/TelephonyAuditRecord";

export interface CreateCallOutcomeData {
  organizationId: string;
  name: string;
  sortOrder?: number;
}

export interface UpdateCallOutcomeData {
  name?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CallOutcomeRepository {
  findById(id: string): Promise<CallOutcome | null>;
  findByName(organizationId: string, name: string): Promise<CallOutcome | null>;
  list(organizationId: string): Promise<CallOutcome[]>;

  /** Creates the Call Outcome and a "created" Audit Record atomically. */
  createWithAudit(
    data: CreateCallOutcomeData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallOutcome>;

  /** Updates the Call Outcome and records an "updated" Audit Record (before/after) atomically. */
  updateWithAudit(
    id: string,
    data: UpdateCallOutcomeData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallOutcome>;
}
