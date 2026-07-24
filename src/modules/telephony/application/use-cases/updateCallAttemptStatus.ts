// ============================================================================
// src/modules/telephony/application/use-cases/updateCallAttemptStatus.ts
//
// Transitions a Call Attempt's lifecycle status (docs/modules/telephony.md
// state diagram), validated against CallLifecycle's state machine. An
// Agent may attach a Call Outcome and/or Disposition when moving into a
// terminal status. Immutable once terminal (ADR 0006): no further
// transitions once COMPLETED/NO_ANSWER/BUSY/FAILED/ABANDONED.
// ============================================================================

import type { CallAttemptRepository } from "../../domain/repositories/CallAttemptRepository";
import type { CallOutcomeRepository } from "../../domain/repositories/CallOutcomeRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import { isTerminalCallStatus } from "../../domain/entities/CallAttempt";
import { canTransitionCallStatus } from "../../domain/entities/CallLifecycle";
import {
  CallAttemptNotFoundError,
  InvalidCallOutcomeReferenceError,
  InvalidCallStatusTransitionError,
} from "../../domain/errors/TelephonyErrors";
import type { UpdateCallAttemptStatusInput } from "../validators/telephonySchemas";
import { toCallAttemptDto, type CallAttemptDto } from "../dto/CallAttemptDto";
import { loadCallOutcomeLookups } from "./callOutcomeLookups";

export interface UpdateCallAttemptStatusCommand {
  id: string;
  input: UpdateCallAttemptStatusInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeUpdateCallAttemptStatus(
  repository: CallAttemptRepository,
  callOutcomeRepository: CallOutcomeRepository,
) {
  return async function updateCallAttemptStatus(
    command: UpdateCallAttemptStatusCommand,
  ): Promise<CallAttemptDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new CallAttemptNotFoundError(id);
    }

    if (!canTransitionCallStatus(existing.status, input.status)) {
      throw new InvalidCallStatusTransitionError(existing.status, input.status);
    }

    if (input.callOutcomeId) {
      const outcome = await callOutcomeRepository.findById(input.callOutcomeId);
      if (!outcome || outcome.organizationId !== existing.organizationId) {
        throw new InvalidCallOutcomeReferenceError(input.callOutcomeId);
      }
    }

    const now = new Date();
    const becameTerminal = isTerminalCallStatus(input.status);
    const updated = await repository.updateStatusWithAudit(
      id,
      {
        status: input.status,
        disposition: input.disposition ?? undefined,
        callOutcomeId: input.callOutcomeId,
        answeredAt: input.status === "ANSWERED" ? now : undefined,
        endedAt: becameTerminal ? now : undefined,
        durationSeconds:
          becameTerminal && existing.answeredAt
            ? Math.max(0, Math.round((now.getTime() - existing.answeredAt.getTime()) / 1000))
            : undefined,
      },
      actor,
      correlationId,
    );

    const lookups = await loadCallOutcomeLookups(callOutcomeRepository, updated.organizationId);
    return toCallAttemptDto(updated, lookups);
  };
}
