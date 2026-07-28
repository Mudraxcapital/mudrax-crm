// ============================================================================
// src/modules/telephony/domain/repositories/CallAttemptRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaCallAttemptRepository.
// ============================================================================

import type {
  CallAttempt,
  CallDirection,
  CallDisposition,
  CallStatus,
} from "../entities/CallAttempt";
import type { TelephonyAuditActor, TelephonyAuditRecord } from "../entities/TelephonyAuditRecord";

export interface CreateCallAttemptData {
  organizationId: string;
  leadId: string | null;
  customerId: string | null;
  agentUserId: string | null;
  direction: CallDirection;
  status: CallStatus;
  callerIdUsed?: string | null;
  providerCallId?: string | null;
  retryOfCallAttemptId?: string | null;
}

export interface UpdateCallStatusData {
  status: CallStatus;
  disposition?: CallDisposition | null;
  callOutcomeId?: string | null;
  answeredAt?: Date | null;
  endedAt?: Date | null;
  durationSeconds?: number | null;
}

export interface ListCallAttemptsFilter {
  leadId?: string;
  customerId?: string;
  agentUserId?: string;
  /** Hierarchy allow-list (Manager / Team Lead tree). */
  agentUserIds?: string[];
  status?: CallStatus;
  missedOnly?: boolean;
  direction?: CallDirection;
  initiatedFrom?: Date;
  initiatedTo?: Date;
  limit?: number;
  offset?: number;
}

export interface CallsByAgentEntry {
  agentUserId: string | null;
  count: number;
}

/** Agent scope for dashboard aggregations (Caller SELF / Team Lead tree). */
export interface CallAgentScopeFilter {
  agentUserId?: string;
  agentUserIds?: string[];
}

export interface CallAttemptRepository {
  findById(id: string): Promise<CallAttempt | null>;
  list(organizationId: string, filter?: ListCallAttemptsFilter): Promise<CallAttempt[]>;
  listByLead(leadId: string): Promise<CallAttempt[]>;
  listByCustomer(customerId: string): Promise<CallAttempt[]>;
  count(organizationId: string, filter?: ListCallAttemptsFilter): Promise<number>;

  /** Creates the Call Attempt (status = INITIATING/RINGING) plus a "created" Audit Record atomically — the Click-to-Call write path. */
  createWithAudit(
    data: CreateCallAttemptData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallAttempt>;

  /** Transitions the Call Attempt's lifecycle status (and optionally disposition/Call Outcome) plus an Audit Record atomically. */
  updateStatusWithAudit(
    id: string,
    data: UpdateCallStatusData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallAttempt>;

  listAuditLog(callAttemptId: string): Promise<TelephonyAuditRecord[]>;
  listRecentAuditLog(organizationId: string, limit: number): Promise<TelephonyAuditRecord[]>;

  // -- Telephony Dashboard aggregations --------------------------------------
  countInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    filter?: { statuses?: CallStatus[] } & CallAgentScopeFilter,
  ): Promise<number>;
  averageDurationInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    filter?: CallAgentScopeFilter,
  ): Promise<number | null>;
  countByAgentInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    filter?: CallAgentScopeFilter,
  ): Promise<CallsByAgentEntry[]>;
  listRecent(
    organizationId: string,
    limit: number,
    filter?: CallAgentScopeFilter,
  ): Promise<CallAttempt[]>;
}
