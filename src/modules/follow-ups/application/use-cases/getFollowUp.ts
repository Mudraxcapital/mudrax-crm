// ============================================================================
// src/modules/follow-ups/application/use-cases/getFollowUp.ts
//
// Read-only lookups for the Follow-up aggregate.
// ============================================================================

import type {
  FollowUpRepository,
  ListFollowUpsFilter,
} from "../../domain/repositories/FollowUpRepository";
import { FollowUpNotFoundError } from "../../domain/errors/FollowUpErrors";
import { toFollowUpDto, type FollowUpDto } from "../dto/FollowUpDto";

export function makeGetFollowUp(repository: FollowUpRepository) {
  return async function getFollowUp(id: string): Promise<FollowUpDto> {
    const followUp = await repository.findById(id);
    if (!followUp) {
      throw new FollowUpNotFoundError(id);
    }
    return toFollowUpDto(followUp);
  };
}

export function makeListFollowUps(repository: FollowUpRepository) {
  return async function listFollowUps(
    organizationId: string,
    filter?: ListFollowUpsFilter,
  ): Promise<FollowUpDto[]> {
    const followUps = await repository.list(organizationId, filter);
    return followUps.map(toFollowUpDto);
  };
}

export function makeListFollowUpsByLead(repository: FollowUpRepository) {
  return async function listFollowUpsByLead(leadId: string): Promise<FollowUpDto[]> {
    const followUps = await repository.listByLead(leadId);
    return followUps.map(toFollowUpDto);
  };
}

export function makeCountFollowUps(repository: FollowUpRepository) {
  return async function countFollowUps(
    organizationId: string,
    filter?: ListFollowUpsFilter,
  ): Promise<number> {
    return repository.count(organizationId, filter);
  };
}
