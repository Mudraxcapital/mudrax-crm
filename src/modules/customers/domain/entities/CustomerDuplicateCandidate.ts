// ============================================================================
// src/modules/customers/domain/entities/CustomerDuplicateCandidate.ts
// ============================================================================

export const DUPLICATE_MATCH_TYPES = [
  "DETERMINISTIC_PAN",
  "DETERMINISTIC_AADHAAR",
  "PROBABILISTIC_PHONE",
  "PROBABILISTIC_EMAIL",
  "PROBABILISTIC_NAME_DOB",
] as const;
export type DuplicateMatchType = (typeof DUPLICATE_MATCH_TYPES)[number];

export const DUPLICATE_CANDIDATE_STATUSES = [
  "DETECTED",
  "REVIEWED",
  "MERGED",
  "DISMISSED",
] as const;
export type DuplicateCandidateStatus = (typeof DUPLICATE_CANDIDATE_STATUSES)[number];

export interface CustomerDuplicateCandidate {
  id: string;
  customerAId: string;
  customerBId: string;
  matchType: DuplicateMatchType;
  matchScore: number | null;
  status: DuplicateCandidateStatus;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerMerge {
  id: string;
  survivingCustomerId: string;
  mergedAwayCustomerId: string;
  duplicateCandidateId: string | null;
  mergedByUserId: string;
  reason: string | null;
  mergedAt: Date;
}
