// ============================================================================
// src/modules/follow-ups/application/use-cases/listFollowUpReassignmentHistory.ts
// ============================================================================

import type { FollowUpRepository } from "../../domain/repositories/FollowUpRepository";
import {
  toFollowUpReassignmentDto,
  type FollowUpReassignmentDto,
} from "../dto/FollowUpReassignmentDto";

export function makeListFollowUpReassignmentHistory(repository: FollowUpRepository) {
  return async function listFollowUpReassignmentHistory(
    followUpId: string,
  ): Promise<FollowUpReassignmentDto[]> {
    const history = await repository.listReassignmentHistory(followUpId);
    return history.map(toFollowUpReassignmentDto);
  };
}
