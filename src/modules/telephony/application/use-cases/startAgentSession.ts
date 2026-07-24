// ============================================================================
// src/modules/telephony/application/use-cases/startAgentSession.ts
//
// Agent login. Exactly one Active Agent Session is permitted per Extension
// (ADR 0006) — enforced here (pre-check) and by the database's partial
// unique index (agent_sessions_one_active_per_extension) as the final
// guard against races. Get-or-creates the Agent's Extension, since
// Extension provisioning UI is out of this task's scope but Agent Session
// requires a non-null `extensionId`.
// ============================================================================

import type { AgentSessionRepository } from "../../domain/repositories/AgentSessionRepository";
import type { ExtensionRepository } from "../../domain/repositories/ExtensionRepository";
import type { UserLookupPort } from "../ports/UserLookupPort";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import {
  AgentSessionAlreadyActiveError,
  InvalidAgentReferenceError,
} from "../../domain/errors/TelephonyErrors";
import type { StartAgentSessionInput } from "../validators/telephonySchemas";
import { toAgentSessionDto, type AgentSessionDto } from "../dto/AgentSessionDto";

export interface StartAgentSessionCommand {
  organizationId: string;
  userId: string;
  input: StartAgentSessionInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeStartAgentSession(
  repository: AgentSessionRepository,
  extensionRepository: ExtensionRepository,
  userLookup: UserLookupPort,
) {
  return async function startAgentSession(
    command: StartAgentSessionCommand,
  ): Promise<AgentSessionDto> {
    const { organizationId, userId, input, actor, correlationId } = command;

    const user = await userLookup.findById(userId);
    if (!user || user.organizationId !== organizationId || user.status !== "ACTIVE") {
      throw new InvalidAgentReferenceError(userId);
    }

    const existingActive = await repository.findActiveByUserId(userId);
    if (existingActive) {
      throw new AgentSessionAlreadyActiveError(userId);
    }

    let extension = await extensionRepository.findByUserId(userId);
    if (!extension) {
      extension = await extensionRepository.create({
        organizationId,
        userId,
        extensionNumber: input.extensionNumber ?? `EXT-${userId.slice(0, 8)}`,
      });
    }

    const session = await repository.startWithAudit(
      { organizationId, userId, extensionId: extension.id },
      actor,
      correlationId,
    );

    return toAgentSessionDto(session);
  };
}
