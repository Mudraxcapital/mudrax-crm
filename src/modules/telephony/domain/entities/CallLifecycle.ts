// ============================================================================
// src/modules/telephony/domain/entities/CallLifecycle.ts
//
// Call Attempt status transitions. Agents may set any lifecycle status from
// any other (including reversing RINGING ↔ ANSWERED or leaving a terminal
// status) so CRM operators can correct mistakes while on a call.
// ============================================================================

import type { CallStatus } from "./CallAttempt";

export function canTransitionCallStatus(from: CallStatus, to: CallStatus): boolean {
  return from !== to;
}
