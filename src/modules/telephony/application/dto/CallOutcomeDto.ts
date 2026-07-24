// ============================================================================
// src/modules/telephony/application/dto/CallOutcomeDto.ts
// ============================================================================

import type { CallOutcome } from "../../domain/entities/CallOutcome";

export interface CallOutcomeDto {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function toCallOutcomeDto(outcome: CallOutcome): CallOutcomeDto {
  return {
    id: outcome.id,
    organizationId: outcome.organizationId,
    name: outcome.name,
    isActive: outcome.isActive,
    sortOrder: outcome.sortOrder,
    createdAt: outcome.createdAt.toISOString(),
    updatedAt: outcome.updatedAt.toISOString(),
  };
}
