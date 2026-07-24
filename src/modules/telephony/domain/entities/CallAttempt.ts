// ============================================================================
// src/modules/telephony/domain/entities/CallAttempt.ts
//
// Aggregate Root for the atomic unit of telephony execution (ADR 0006,
// docs/modules/telephony.md). Immutable once Completed. Framework-free: no
// Prisma types leak past the infrastructure/mappers layer.
//
// This reduced-scope implementation covers Call Logs / Call History /
// Click-to-Call / Missed Calls / the Telephony Dashboard. Trunk/Telephony
// Line/IVR-driven routing fields exist in the schema (prisma/models/
// telephony.prisma) but are intentionally left unset here — out of scope
// per this task's "Implement ONLY" list.
// ============================================================================

export const CALL_DIRECTIONS = ["INBOUND", "OUTBOUND", "INTERNAL"] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export const CALL_STATUSES = [
  "INITIATING",
  "RINGING",
  "ANSWERED",
  "ON_HOLD",
  "TRANSFERRING",
  "CONFERENCING",
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "ABANDONED",
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

/** Terminal statuses meaning "the line never connected" — the Missed Calls view (docs/modules/telephony.md). */
export const MISSED_CALL_STATUSES: CallStatus[] = ["NO_ANSWER", "BUSY", "FAILED", "ABANDONED"];

/** Every status with no further lifecycle transition. */
export const TERMINAL_CALL_STATUSES: CallStatus[] = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "ABANDONED",
];

export const CALL_DISPOSITIONS = [
  "ANSWERED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "VOICEMAIL",
  "CONGESTION",
] as const;
export type CallDisposition = (typeof CALL_DISPOSITIONS)[number];

export interface CallAttempt {
  id: string;
  organizationId: string;
  leadId: string | null;
  customerId: string | null;
  agentUserId: string | null;
  direction: CallDirection;
  status: CallStatus;
  disposition: CallDisposition | null;
  callOutcomeId: string | null;
  retryOfCallAttemptId: string | null;
  callerIdUsed: string | null;
  providerCallId: string | null;
  initiatedAt: Date;
  answeredAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function isMissedCallStatus(status: CallStatus): boolean {
  return MISSED_CALL_STATUSES.includes(status);
}

export function isTerminalCallStatus(status: CallStatus): boolean {
  return TERMINAL_CALL_STATUSES.includes(status);
}
