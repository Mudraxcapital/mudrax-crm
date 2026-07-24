// ============================================================================
// src/modules/customers/application/dto/DuplicateDto.ts
// ============================================================================

import type {
  CustomerDuplicateCandidate,
  CustomerMerge,
} from "../../domain/entities/CustomerDuplicateCandidate";

export interface DuplicateCandidateDto {
  id: string;
  customerAId: string;
  customerBId: string;
  matchType: CustomerDuplicateCandidate["matchType"];
  matchScore: number | null;
  status: CustomerDuplicateCandidate["status"];
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface CustomerMergeDto {
  id: string;
  survivingCustomerId: string;
  mergedAwayCustomerId: string;
  duplicateCandidateId: string | null;
  mergedByUserId: string;
  reason: string | null;
  mergedAt: string;
}

export function toDuplicateCandidateDto(
  candidate: CustomerDuplicateCandidate,
): DuplicateCandidateDto {
  return {
    id: candidate.id,
    customerAId: candidate.customerAId,
    customerBId: candidate.customerBId,
    matchType: candidate.matchType,
    matchScore: candidate.matchScore,
    status: candidate.status,
    reviewedByUserId: candidate.reviewedByUserId,
    reviewedAt: candidate.reviewedAt ? candidate.reviewedAt.toISOString() : null,
    createdAt: candidate.createdAt.toISOString(),
  };
}

export function toCustomerMergeDto(merge: CustomerMerge): CustomerMergeDto {
  return {
    id: merge.id,
    survivingCustomerId: merge.survivingCustomerId,
    mergedAwayCustomerId: merge.mergedAwayCustomerId,
    duplicateCandidateId: merge.duplicateCandidateId,
    mergedByUserId: merge.mergedByUserId,
    reason: merge.reason,
    mergedAt: merge.mergedAt.toISOString(),
  };
}
