// ============================================================================
// src/modules/telephony/domain/entities/CallLifecycle.ts
//
// The Call Attempt state machine (docs/modules/telephony.md "Call Attempt
// state diagram"). Centralized here so both the use-case layer and its
// tests share one source of truth for which transitions are legal.
// ============================================================================

import type { CallStatus } from "./CallAttempt";

const ALLOWED_TRANSITIONS: Record<CallStatus, CallStatus[]> = {
  INITIATING: ["RINGING", "FAILED"],
  RINGING: ["ANSWERED", "NO_ANSWER", "BUSY", "FAILED", "ABANDONED"],
  ANSWERED: ["ON_HOLD", "TRANSFERRING", "CONFERENCING", "COMPLETED"],
  ON_HOLD: ["ANSWERED"],
  TRANSFERRING: ["ANSWERED"],
  CONFERENCING: ["ANSWERED"],
  COMPLETED: [],
  NO_ANSWER: [],
  BUSY: [],
  FAILED: [],
  ABANDONED: [],
};

export function canTransitionCallStatus(from: CallStatus, to: CallStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
