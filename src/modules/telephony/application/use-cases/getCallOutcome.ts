// ============================================================================
// src/modules/telephony/application/use-cases/getCallOutcome.ts
// ============================================================================

import type { CallOutcomeRepository } from "../../domain/repositories/CallOutcomeRepository";
import { CallOutcomeNotFoundError } from "../../domain/errors/TelephonyErrors";
import { toCallOutcomeDto, type CallOutcomeDto } from "../dto/CallOutcomeDto";

export function makeGetCallOutcome(repository: CallOutcomeRepository) {
  return async function getCallOutcome(id: string): Promise<CallOutcomeDto> {
    const outcome = await repository.findById(id);
    if (!outcome) {
      throw new CallOutcomeNotFoundError(id);
    }
    return toCallOutcomeDto(outcome);
  };
}

export function makeListCallOutcomes(repository: CallOutcomeRepository) {
  return async function listCallOutcomes(organizationId: string): Promise<CallOutcomeDto[]> {
    const outcomes = await repository.list(organizationId);
    return outcomes.map(toCallOutcomeDto);
  };
}
