// ============================================================================
// src/modules/telephony/domain/entities/AgentSession.ts
//
// Aggregate Root, independent of Call Attempt (ADR 0006). One Agent's
// continuous work session from Login to Logout. `OnCall`/`AfterCallWork`
// are system-derived from a bound Call Attempt's own lifecycle in a full
// implementation; this reduced scope exposes the remaining, Agent-driven
// transitions (Available/Break/Idle/Busy) plus Login/Logout.
// ============================================================================

export const AGENT_SESSION_STATUSES = [
  "LOGGED_IN",
  "AVAILABLE",
  "ON_CALL",
  "AFTER_CALL_WORK",
  "IDLE",
  "BREAK",
  "BUSY",
  "LOGGED_OUT",
] as const;
export type AgentSessionStatus = (typeof AGENT_SESSION_STATUSES)[number];

/** Statuses an Agent may transition to manually via changeAgentSessionStatus — ON_CALL/AFTER_CALL_WORK are system-derived (ADR 0006) and LOGGED_IN/LOGGED_OUT are set exclusively by start/end Agent Session. */
export const MANUAL_AGENT_SESSION_STATUSES: AgentSessionStatus[] = [
  "AVAILABLE",
  "IDLE",
  "BREAK",
  "BUSY",
];

export interface AgentSession {
  id: string;
  organizationId: string;
  userId: string;
  extensionId: string;
  status: AgentSessionStatus;
  remoteAgentContext: Record<string, unknown> | null;
  loginAt: Date;
  logoutAt: Date | null;
}

export interface AgentStatusHistory {
  id: string;
  agentSessionId: string;
  status: AgentSessionStatus;
  changedAt: Date;
}
