// ============================================================================
// src/modules/telephony/application/use-cases/getAgentSession.ts
//
// Read-only lookups for the Agent Session aggregate.
// ============================================================================

import type {
  AgentSessionRepository,
  ListAgentSessionsFilter,
} from "../../domain/repositories/AgentSessionRepository";
import { AgentSessionNotFoundError } from "../../domain/errors/TelephonyErrors";
import {
  toAgentSessionDto,
  toAgentStatusHistoryDto,
  type AgentSessionDto,
  type AgentStatusHistoryDto,
} from "../dto/AgentSessionDto";
import type { TelephonyAuditRecord } from "../../domain/entities/TelephonyAuditRecord";

export function makeGetAgentSession(repository: AgentSessionRepository) {
  return async function getAgentSession(id: string): Promise<AgentSessionDto> {
    const session = await repository.findById(id);
    if (!session) {
      throw new AgentSessionNotFoundError(id);
    }
    return toAgentSessionDto(session);
  };
}

export function makeGetActiveAgentSession(repository: AgentSessionRepository) {
  return async function getActiveAgentSession(userId: string): Promise<AgentSessionDto | null> {
    const session = await repository.findActiveByUserId(userId);
    return session ? toAgentSessionDto(session) : null;
  };
}

export function makeListAgentSessions(repository: AgentSessionRepository) {
  return async function listAgentSessions(
    organizationId: string,
    filter?: ListAgentSessionsFilter,
  ): Promise<AgentSessionDto[]> {
    const sessions = await repository.list(organizationId, filter);
    return sessions.map(toAgentSessionDto);
  };
}

export function makeListAgentStatusHistory(repository: AgentSessionRepository) {
  return async function listAgentStatusHistory(
    agentSessionId: string,
  ): Promise<AgentStatusHistoryDto[]> {
    const history = await repository.listStatusHistory(agentSessionId);
    return history.map(toAgentStatusHistoryDto);
  };
}

export function makeListAgentSessionAuditLog(repository: AgentSessionRepository) {
  return async function listAgentSessionAuditLog(
    agentSessionId: string,
  ): Promise<TelephonyAuditRecord[]> {
    return repository.listAuditLog(agentSessionId);
  };
}
