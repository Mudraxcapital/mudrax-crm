// ============================================================================
// src/modules/telephony/application/use-cases/createCallOutcome.ts
// ============================================================================

import type { CallOutcomeRepository } from "../../domain/repositories/CallOutcomeRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import { DuplicateCallOutcomeNameError } from "../../domain/errors/TelephonyErrors";
import type { CreateCallOutcomeInput } from "../validators/telephonySchemas";
import { toCallOutcomeDto, type CallOutcomeDto } from "../dto/CallOutcomeDto";

export interface CreateCallOutcomeCommand {
  organizationId: string;
  input: CreateCallOutcomeInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeCreateCallOutcome(repository: CallOutcomeRepository) {
  return async function createCallOutcome(
    command: CreateCallOutcomeCommand,
  ): Promise<CallOutcomeDto> {
    const { organizationId, input, actor, correlationId } = command;

    const existing = await repository.findByName(organizationId, input.name);
    if (existing) {
      throw new DuplicateCallOutcomeNameError(input.name);
    }

    const created = await repository.createWithAudit(
      { organizationId, name: input.name, sortOrder: input.sortOrder },
      actor,
      correlationId,
    );

    return toCallOutcomeDto(created);
  };
}
