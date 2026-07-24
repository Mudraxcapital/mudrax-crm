// ============================================================================
// src/modules/telephony/application/use-cases/getCallAttempt.ts
//
// Read-only lookups for the Call Attempt aggregate — Call Logs, Call
// History (by Lead/Customer/Agent), and the Missed Calls view (a filtered
// list, not a separate entity — docs/modules/telephony.md).
// ============================================================================

import type {
  CallAttemptRepository,
  ListCallAttemptsFilter,
} from "../../domain/repositories/CallAttemptRepository";
import type { CallOutcomeRepository } from "../../domain/repositories/CallOutcomeRepository";
import { CallAttemptNotFoundError } from "../../domain/errors/TelephonyErrors";
import { toCallAttemptDto, type CallAttemptDto } from "../dto/CallAttemptDto";
import { loadCallOutcomeLookups } from "./callOutcomeLookups";

export function makeGetCallAttempt(
  repository: CallAttemptRepository,
  callOutcomeRepository: CallOutcomeRepository,
) {
  return async function getCallAttempt(id: string): Promise<CallAttemptDto> {
    const call = await repository.findById(id);
    if (!call) {
      throw new CallAttemptNotFoundError(id);
    }
    const lookups = await loadCallOutcomeLookups(callOutcomeRepository, call.organizationId);
    return toCallAttemptDto(call, lookups);
  };
}

export function makeListCallAttempts(
  repository: CallAttemptRepository,
  callOutcomeRepository: CallOutcomeRepository,
) {
  return async function listCallAttempts(
    organizationId: string,
    filter?: ListCallAttemptsFilter,
  ): Promise<CallAttemptDto[]> {
    const [calls, lookups] = await Promise.all([
      repository.list(organizationId, filter),
      loadCallOutcomeLookups(callOutcomeRepository, organizationId),
    ]);
    return calls.map((call) => toCallAttemptDto(call, lookups));
  };
}

/** Missed Calls view — a filtered list of terminal, never-connected Call Attempts (docs/modules/telephony.md), not a separate entity. */
export function makeListMissedCalls(
  repository: CallAttemptRepository,
  callOutcomeRepository: CallOutcomeRepository,
) {
  return async function listMissedCalls(
    organizationId: string,
    filter?: Omit<ListCallAttemptsFilter, "missedOnly">,
  ): Promise<CallAttemptDto[]> {
    const [calls, lookups] = await Promise.all([
      repository.list(organizationId, { ...filter, missedOnly: true }),
      loadCallOutcomeLookups(callOutcomeRepository, organizationId),
    ]);
    return calls.map((call) => toCallAttemptDto(call, lookups));
  };
}

export function makeListCallHistoryByLead(
  repository: CallAttemptRepository,
  callOutcomeRepository: CallOutcomeRepository,
) {
  return async function listCallHistoryByLead(leadId: string): Promise<CallAttemptDto[]> {
    const calls = await repository.listByLead(leadId);
    if (calls.length === 0) return [];
    const lookups = await loadCallOutcomeLookups(callOutcomeRepository, calls[0]!.organizationId);
    return calls.map((call) => toCallAttemptDto(call, lookups));
  };
}

export function makeListCallHistoryByCustomer(
  repository: CallAttemptRepository,
  callOutcomeRepository: CallOutcomeRepository,
) {
  return async function listCallHistoryByCustomer(customerId: string): Promise<CallAttemptDto[]> {
    const calls = await repository.listByCustomer(customerId);
    if (calls.length === 0) return [];
    const lookups = await loadCallOutcomeLookups(callOutcomeRepository, calls[0]!.organizationId);
    return calls.map((call) => toCallAttemptDto(call, lookups));
  };
}

export function makeCountCallAttempts(repository: CallAttemptRepository) {
  return async function countCallAttempts(
    organizationId: string,
    filter?: ListCallAttemptsFilter,
  ): Promise<number> {
    return repository.count(organizationId, filter);
  };
}
