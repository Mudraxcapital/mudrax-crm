// ============================================================================
// src/modules/telephony/application/use-cases/callOutcomeLookups.ts
//
// Shared helper: loads the Call Outcome catalog for an Organization into a
// lookup Map, for enriching CallAttemptDto without every use-case
// re-implementing the same list call (mirrors leads' catalogLookups.ts).
// ============================================================================

import type { CallOutcomeRepository } from "../../domain/repositories/CallOutcomeRepository";
import type { CallOutcomeLookups } from "../dto/CallAttemptDto";

export async function loadCallOutcomeLookups(
  repository: CallOutcomeRepository,
  organizationId: string,
): Promise<CallOutcomeLookups> {
  const outcomes = await repository.list(organizationId);
  return { outcomesById: new Map(outcomes.map((outcome) => [outcome.id, outcome])) };
}
