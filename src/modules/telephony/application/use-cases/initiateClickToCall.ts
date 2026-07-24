// ============================================================================
// src/modules/telephony/application/use-cases/initiateClickToCall.ts
//
// Click-to-Call: originates an outbound call through the configured
// ITelephonyProvider (Null adapter today, per ADR 0006) and creates the
// resulting Call Attempt in RINGING status. Calls must reference at least
// one of Lead/Customer (Zod-enforced) and, when present, both references
// and the assigned Agent are validated against this Organization.
// ============================================================================

import type { CallAttemptRepository } from "../../domain/repositories/CallAttemptRepository";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import type { LeadLookupPort } from "../ports/LeadLookupPort";
import type { CustomerLookupPort } from "../ports/CustomerLookupPort";
import type { UserLookupPort } from "../ports/UserLookupPort";
import type { TelephonyProviderPort } from "../ports/TelephonyProviderPort";
import {
  InvalidAgentReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
} from "../../domain/errors/TelephonyErrors";
import type { InitiateClickToCallInput } from "../validators/telephonySchemas";
import { toCallAttemptDto, type CallAttemptDto } from "../dto/CallAttemptDto";
import { loadCallOutcomeLookups } from "./callOutcomeLookups";
import type { CallOutcomeRepository } from "../../domain/repositories/CallOutcomeRepository";

export interface InitiateClickToCallCommand {
  organizationId: string;
  input: InitiateClickToCallInput;
  actor: TelephonyAuditActor;
  correlationId?: string | null;
}

export function makeInitiateClickToCall(
  repository: CallAttemptRepository,
  callOutcomeRepository: CallOutcomeRepository,
  leadLookup: LeadLookupPort,
  customerLookup: CustomerLookupPort,
  userLookup: UserLookupPort,
  provider: TelephonyProviderPort,
) {
  return async function initiateClickToCall(
    command: InitiateClickToCallCommand,
  ): Promise<CallAttemptDto> {
    const { organizationId, input, actor, correlationId } = command;

    if (input.leadId) {
      const lead = await leadLookup.findById(input.leadId);
      if (!lead || lead.organizationId !== organizationId) {
        throw new InvalidLeadReferenceError(input.leadId);
      }
    }

    if (input.customerId) {
      const customer = await customerLookup.findById(input.customerId);
      if (!customer || customer.organizationId !== organizationId) {
        throw new InvalidCustomerReferenceError(input.customerId);
      }
    }

    const agentUserId = input.agentUserId ?? (actor.actorType === "USER" ? actor.actorId : null);
    if (agentUserId) {
      const agent = await userLookup.findById(agentUserId);
      if (!agent || agent.organizationId !== organizationId || agent.status !== "ACTIVE") {
        throw new InvalidAgentReferenceError(agentUserId);
      }
    }

    const { providerCallId } = await provider.originateCall({
      organizationId,
      toPhoneNumber: input.toPhoneNumber ?? null,
      callerIdUsed: input.callerIdUsed ?? null,
    });

    const created = await repository.createWithAudit(
      {
        organizationId,
        leadId: input.leadId ?? null,
        customerId: input.customerId ?? null,
        agentUserId,
        direction: "OUTBOUND",
        status: "RINGING",
        callerIdUsed: input.callerIdUsed ?? null,
        providerCallId,
      },
      actor,
      correlationId,
    );

    const lookups = await loadCallOutcomeLookups(callOutcomeRepository, organizationId);
    return toCallAttemptDto(created, lookups);
  };
}
