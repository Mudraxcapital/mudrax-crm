// ============================================================================
// src/modules/telephony/domain/repositories/AgentSessionRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaAgentSessionRepository.
// ============================================================================

import type { AgentSession, AgentSessionStatus, AgentStatusHistory } from "../entities/AgentSession";
import type { TelephonyAuditActor, TelephonyAuditRecord } from "../entities/TelephonyAuditRecord";

export interface StartAgentSessionData {
  organizationId: string;
  userId: string;
  extensionId: string;
  remoteAgentContext?: Record<string, unknown> | null;
}

export interface ListAgentSessionsFilter {
  userId?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface AgentSessionRepository {
  findById(id: string): Promise<AgentSession | null>;
  /** The one Active (non-LOGGED_OUT) session for a User, if any (ADR 0006: at most one per Extension). */
  findActiveByUserId(userId: string): Promise<AgentSession | null>;
  list(organizationId: string, filter?: ListAgentSessionsFilter): Promise<AgentSession[]>;

  /** Creates the Agent Session (status LOGGED_IN), its initial Agent Status History entry, and a "session started" Audit Record atomically. */
  startWithAudit(
    data: StartAgentSessionData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession>;

  /** Appends a new Agent Status History entry, updates the session's current status, and records an Audit Record atomically. */
  changeStatusWithAudit(
    id: string,
    status: AgentSessionStatus,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession>;

  /** Ends the session (logoutAt/status=LOGGED_OUT), appends the terminal Agent Status History entry, and records an Audit Record atomically. A session, once ended, is never reopened (ADR 0006). */
  endWithAudit(
    id: string,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession>;

  listStatusHistory(agentSessionId: string): Promise<AgentStatusHistory[]>;
  listAuditLog(agentSessionId: string): Promise<TelephonyAuditRecord[]>;
}
