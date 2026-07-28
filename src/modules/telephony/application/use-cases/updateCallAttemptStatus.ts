// ============================================================================
// src/modules/telephony/application/use-cases/updateCallAttemptStatus.ts
//
// Transitions a Call Attempt's lifecycle status. Agents may move to any
// different status (including reversing or leaving a terminal status) so
// CRM operators can correct mistakes while on a call. An Agent may attach
// a Call Outcome and/or Disposition when updating status.
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
    const leavingTerminal = isTerminalCallStatus(existing.status);
    const becameTerminal = isTerminalCallStatus(input.status);
    const becomingAnswered = input.status === "ANSWERED";

    const answeredAt = becomingAnswered
      ? (existing.answeredAt ?? now)
      : undefined;

    const answerStamp = existing.answeredAt ?? answeredAt ?? null;
    const shouldStampDuration =
      answerStamp != null &&
      existing.durationSeconds == null &&
      !leavingTerminal &&
      (becameTerminal ||
        (existing.answeredAt != null &&
          input.status !== "ANSWERED" &&
          input.status !== "ON_HOLD" &&
          input.status !== "TRANSFERRING" &&
          input.status !== "CONFERENCING"));

    const updated = await repository.updateStatusWithAudit(
      id,
      {
        status: input.status,
        disposition: input.disposition ?? undefined,
        callOutcomeId: input.callOutcomeId,
        answeredAt,
        // Clear end markers when leaving a terminal status so re-completion recalculates.
        endedAt: becameTerminal ? now : leavingTerminal ? null : undefined,
        durationSeconds: shouldStampDuration
          ? Math.max(0, Math.round((now.getTime() - answerStamp!.getTime()) / 1000))
          : leavingTerminal
            ? null
            : undefined,
      },
      actor,
      correlationId,
    );

    const lookups = await loadCallOutcomeLookups(callOutcomeRepository, updated.organizationId);
    return toCallAttemptDto(updated, lookups);
  };
}
