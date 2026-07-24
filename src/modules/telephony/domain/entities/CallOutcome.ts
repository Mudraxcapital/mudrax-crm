// ============================================================================
// src/modules/telephony/domain/entities/CallOutcome.ts
//
// Admin-configurable catalog of business Call Outcomes an Agent may record
// against a Call Attempt (docs/modules/telephony.md — "Call outcomes must
// be configurable"). Never a hardcoded enum, and permanently distinct from
// the system-detected `CallDisposition` value in CallAttempt.ts and from
// `leads`' Call Feedback Status (ADR 0006).
// ============================================================================

export interface CallOutcome {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
