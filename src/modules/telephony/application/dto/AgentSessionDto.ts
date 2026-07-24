// ============================================================================
// src/modules/telephony/application/dto/AgentSessionDto.ts
// ============================================================================

import type { AgentSession, AgentStatusHistory } from "../../domain/entities/AgentSession";

export interface AgentSessionDto {
  id: string;
  organizationId: string;
  userId: string;
  extensionId: string;
  status: AgentSession["status"];
  loginAt: string;
  logoutAt: string | null;
}

export interface AgentStatusHistoryDto {
  id: string;
  agentSessionId: string;
  status: AgentStatusHistory["status"];
  changedAt: string;
}

export function toAgentSessionDto(session: AgentSession): AgentSessionDto {
  return {
    id: session.id,
    organizationId: session.organizationId,
    userId: session.userId,
    extensionId: session.extensionId,
    status: session.status,
    loginAt: session.loginAt.toISOString(),
    logoutAt: session.logoutAt ? session.logoutAt.toISOString() : null,
  };
}

export function toAgentStatusHistoryDto(entry: AgentStatusHistory): AgentStatusHistoryDto {
  return {
    id: entry.id,
    agentSessionId: entry.agentSessionId,
    status: entry.status,
    changedAt: entry.changedAt.toISOString(),
  };
}
