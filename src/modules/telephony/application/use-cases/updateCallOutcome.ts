// ============================================================================
// src/modules/telephony/application/use-cases/updateCallOutcome.ts
// ============================================================================

import type { CallOutcomeRepository } from "../../domain/repositories/CallOutcomeRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import {
  CallOutcomeNotFoundError,
  DuplicateCallOutcomeNameError,
} from "../../domain/errors/TelephonyErrors";
import type { UpdateCallOutcomeInput } from "../validators/telephonySchemas";
import { toCallOutcomeDto, type CallOutcomeDto } from "../dto/CallOutcomeDto";

export interface UpdateCallOutcomeCommand {
  id: string;
  input: UpdateCallOutcomeInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeUpdateCallOutcome(repository: CallOutcomeRepository) {
  return async function updateCallOutcome(
    command: UpdateCallOutcomeCommand,
  ): Promise<CallOutcomeDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new CallOutcomeNotFoundError(id);
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await repository.findByName(existing.organizationId, input.name);
      if (duplicate) {
        throw new DuplicateCallOutcomeNameError(input.name);
      }
    }

    const updated = await repository.updateWithAudit(
      id,
      { name: input.name, isActive: input.isActive, sortOrder: input.sortOrder },
      actor,
      correlationId,
    );

    return toCallOutcomeDto(updated);
  };
}
