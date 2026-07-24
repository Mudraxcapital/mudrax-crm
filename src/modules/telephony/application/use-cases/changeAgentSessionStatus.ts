// ============================================================================
// src/modules/telephony/application/use-cases/changeAgentSessionStatus.ts
//
// Agent availability change (Available/Break/Idle/Busy only — ON_CALL and
// AFTER_CALL_WORK are system-derived from Call Attempt lifecycle events in
// a full implementation and are not exposed to manual change here).
// ============================================================================

import type { AgentSessionRepository } from "../../domain/repositories/AgentSessionRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import {
  AgentSessionAlreadyEndedError,
  AgentSessionNotFoundError,
} from "../../domain/errors/TelephonyErrors";
import type { ChangeAgentSessionStatusInput } from "../validators/telephonySchemas";
import { toAgentSessionDto, type AgentSessionDto } from "../dto/AgentSessionDto";

export interface ChangeAgentSessionStatusCommand {
  id: string;
  input: ChangeAgentSessionStatusInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeChangeAgentSessionStatus(repository: AgentSessionRepository) {
  return async function changeAgentSessionStatus(
    command: ChangeAgentSessionStatusCommand,
  ): Promise<AgentSessionDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new AgentSessionNotFoundError(id);
    }
    if (existing.status === "LOGGED_OUT") {
      throw new AgentSessionAlreadyEndedError(id);
    }

    const updated = await repository.changeStatusWithAudit(
      id,
      input.status,
      actor,
      correlationId,
    );

    return toAgentSessionDto(updated);
  };
}
