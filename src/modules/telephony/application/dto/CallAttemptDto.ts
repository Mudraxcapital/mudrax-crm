// ============================================================================
// src/modules/telephony/application/dto/CallAttemptDto.ts
//
// What the Call Attempt aggregate's use-cases return to the presentation
// layer — a plain, serializable shape (dates as ISO strings), enriched with
// the Call Outcome display name so pages don't have to re-join the catalog
// themselves (mirrors leads' LeadDto pattern).
// ============================================================================

import type { CallAttempt } from "../../domain/entities/CallAttempt";
import type { CallOutcome } from "../../domain/entities/CallOutcome";

export interface CallAttemptDto {
  id: string;
  organizationId: string;
  leadId: string | null;
  customerId: string | null;
  agentUserId: string | null;
  direction: CallAttempt["direction"];
  status: CallAttempt["status"];
  disposition: CallAttempt["disposition"];
  callOutcomeId: string | null;
  callOutcomeName: string | null;
  retryOfCallAttemptId: string | null;
  callerIdUsed: string | null;
  providerCallId: string | null;
  initiatedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallOutcomeLookups {
  outcomesById: Map<string, CallOutcome>;
}

export function toCallAttemptDto(call: CallAttempt, lookups: CallOutcomeLookups): CallAttemptDto {
  const outcome = call.callOutcomeId ? lookups.outcomesById.get(call.callOutcomeId) : undefined;

  return {
    id: call.id,
    organizationId: call.organizationId,
    leadId: call.leadId,
    customerId: call.customerId,
    agentUserId: call.agentUserId,
    direction: call.direction,
    status: call.status,
    disposition: call.disposition,
    callOutcomeId: call.callOutcomeId,
    callOutcomeName: outcome?.name ?? null,
    retryOfCallAttemptId: call.retryOfCallAttemptId,
    callerIdUsed: call.callerIdUsed,
    providerCallId: call.providerCallId,
    initiatedAt: call.initiatedAt.toISOString(),
    answeredAt: call.answeredAt ? call.answeredAt.toISOString() : null,
    endedAt: call.endedAt ? call.endedAt.toISOString() : null,
    durationSeconds: call.durationSeconds,
    createdAt: call.createdAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
  };
}
