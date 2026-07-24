// ============================================================================
// src/modules/follow-ups/application/dto/FollowUpReassignmentDto.ts
// ============================================================================

import type { FollowUpReassignment } from "../../domain/entities/FollowUpReassignment";

export interface FollowUpReassignmentDto {
  id: string;
  followUpId: string;
  fromUserId: string | null;
  toUserId: string;
  reassignedByUserId: string;
  reason: string | null;
  reassignedAt: string;
}

export function toFollowUpReassignmentDto(
  reassignment: FollowUpReassignment,
): FollowUpReassignmentDto {
  return {
    id: reassignment.id,
    followUpId: reassignment.followUpId,
    fromUserId: reassignment.fromUserId,
    toUserId: reassignment.toUserId,
    reassignedByUserId: reassignment.reassignedByUserId,
    reason: reassignment.reason,
    reassignedAt: reassignment.reassignedAt.toISOString(),
  };
}
