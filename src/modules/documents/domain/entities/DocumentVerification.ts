// ============================================================================
// src/modules/documents/domain/entities/DocumentVerification.ts
//
// Independent Aggregate Root; one decision cycle confirming a specific,
// *pinned* Document Version is genuine, legible, and correct (ADR 0007).
// Because it pins a Version, uploading a new revision never silently
// re-opens an old decision — a new Version starts its own PENDING cycle.
//
// This reduced scope only creates MANUAL verifications; OCR_ASSISTED and
// EKYC exist in the schema for future capabilities that are explicitly out
// of scope here.
// ============================================================================

export const VERIFICATION_METHODS = ["MANUAL", "OCR_ASSISTED", "EKYC"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const VERIFICATION_STATUSES = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "NEEDS_RESUBMISSION",
  "ESCALATED",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** The three primary outcomes a reviewer picks from in the manual verification form — NEEDS_RESUBMISSION/ESCALATED remain available to API clients and future workflow automation. */
export const MANUAL_VERIFICATION_STATUSES: VerificationStatus[] = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
];

/** Statuses that close a decision cycle: the pinned Version is never re-decided, a new Version is uploaded instead. */
export const TERMINAL_VERIFICATION_STATUSES: VerificationStatus[] = [
  "VERIFIED",
  "REJECTED",
  "NEEDS_RESUBMISSION",
];

export interface DocumentVerification {
  id: string;
  organizationId: string;
  documentVersionId: string;
  method: VerificationMethod;
  status: VerificationStatus;
  verifiedByUserId: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ALLOWED_VERIFICATION_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  PENDING: ["VERIFIED", "REJECTED", "NEEDS_RESUBMISSION", "ESCALATED"],
  ESCALATED: ["VERIFIED", "REJECTED", "NEEDS_RESUBMISSION"],
  VERIFIED: [],
  REJECTED: [],
  NEEDS_RESUBMISSION: [],
};

/**
 * A still-open cycle may be re-submitted as PENDING without effect, so a
 * double-clicked "keep pending" review is idempotent rather than an error.
 * Every other same-status write is rejected, and terminal cycles never
 * re-open.
 */
export function canTransitionVerificationStatus(
  from: VerificationStatus,
  to: VerificationStatus,
): boolean {
  if (from === to) return from === "PENDING";
  return ALLOWED_VERIFICATION_TRANSITIONS[from].includes(to);
}

export function isTerminalVerificationStatus(status: VerificationStatus): boolean {
  return TERMINAL_VERIFICATION_STATUSES.includes(status);
}
