// ============================================================================
// src/modules/telephony/application/use-cases/endAgentSession.ts
//
// Agent logout. A session, once ended, is never reopened (ADR 0006).
// ============================================================================

import type { AgentSessionRepository } from "../../domain/repositories/AgentSessionRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import {
  AgentSessionAlreadyEndedError,
  AgentSessionNotFoundError,
} from "../../domain/errors/TelephonyErrors";
import { toAgentSessionDto, type AgentSessionDto } from "../dto/AgentSessionDto";

export interface EndAgentSessionCommand {
  id: string;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeEndAgentSession(repository: AgentSessionRepository) {
  return async function endAgentSession(command: EndAgentSessionCommand): Promise<AgentSessionDto> {
    const { id, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new AgentSessionNotFoundError(id);
    }
    if (existing.status === "LOGGED_OUT") {
      throw new AgentSessionAlreadyEndedError(id);
    }

    const ended = await repository.endWithAudit(id, actor, correlationId);
    return toAgentSessionDto(ended);
  };
}
