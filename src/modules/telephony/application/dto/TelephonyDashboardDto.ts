// ============================================================================
// src/modules/telephony/application/dto/TelephonyDashboardDto.ts
//
// The basic Telephony Dashboard this task requires: Calls Today, Connected
// Calls, Missed Calls, Average Call Duration, Calls by Agent, Recent Calls.
// ============================================================================

import type { CallAttemptDto } from "./CallAttemptDto";

export interface CallsByAgentDto {
  agentUserId: string | null;
  agentName: string;
  count: number;
}

export interface TelephonyDashboardDto {
  callsToday: number;
  connectedCallsToday: number;
  missedCallsToday: number;
  averageCallDurationSeconds: number | null;
  callsByAgent: CallsByAgentDto[];
  recentCalls: CallAttemptDto[];
}
