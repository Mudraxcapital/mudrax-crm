// ============================================================================
// src/modules/telephony/application/use-cases/getTelephonyDashboard.ts
//
// The basic Telephony Dashboard this task requires: Calls Today, Connected
// Calls, Missed Calls, Average Call Duration, Calls by Agent, Recent Calls
// (mirrors crm's CRM Dashboard aggregation-use-case pattern).
// ============================================================================

import type { CallAttemptRepository } from "../../domain/repositories/CallAttemptRepository";
import type { CallOutcomeRepository } from "../../domain/repositories/CallOutcomeRepository";
import type { UserLookupPort } from "../ports/UserLookupPort";
import { MISSED_CALL_STATUSES, type CallStatus } from "../../domain/entities/CallAttempt";
import { toCallAttemptDto } from "../dto/CallAttemptDto";
import type { CallsByAgentDto, TelephonyDashboardDto } from "../dto/TelephonyDashboardDto";
import { loadCallOutcomeLookups } from "./callOutcomeLookups";

/** Statuses meaning the line connected at some point — includes COMPLETED and every mid-call state (docs/modules/telephony.md state diagram). */
const CONNECTED_CALL_STATUSES: CallStatus[] = [
  "ANSWERED",
  "ON_HOLD",
  "TRANSFERRING",
  "CONFERENCING",
  "COMPLETED",
];

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function makeGetTelephonyDashboard(
  repository: CallAttemptRepository,
  callOutcomeRepository: CallOutcomeRepository,
  userLookup: UserLookupPort,
) {
  return async function getTelephonyDashboard(
    organizationId: string,
    now: Date = new Date(),
  ): Promise<TelephonyDashboardDto> {
    const range = { from: startOfDay(now), to: endOfDay(now) };

    const [
      callsToday,
      connectedCallsToday,
      missedCallsToday,
      averageCallDurationSeconds,
      callsByAgentRaw,
      recentCallsRaw,
      lookups,
    ] = await Promise.all([
      repository.countInRange(organizationId, range),
      repository.countInRange(organizationId, range, { statuses: CONNECTED_CALL_STATUSES }),
      repository.countInRange(organizationId, range, { statuses: MISSED_CALL_STATUSES }),
      repository.averageDurationInRange(organizationId, range),
      repository.countByAgentInRange(organizationId, range),
      repository.listRecent(organizationId, 20),
      loadCallOutcomeLookups(callOutcomeRepository, organizationId),
    ]);

    const callsByAgent: CallsByAgentDto[] = await Promise.all(
      callsByAgentRaw.map(async (entry) => {
        if (!entry.agentUserId) {
          return { agentUserId: null, agentName: "Unassigned", count: entry.count };
        }
        const agent = await userLookup.findById(entry.agentUserId);
        return {
          agentUserId: entry.agentUserId,
          agentName: agent?.fullName ?? "Unknown Agent",
          count: entry.count,
        };
      }),
    );

    return {
      callsToday,
      connectedCallsToday,
      missedCallsToday,
      averageCallDurationSeconds,
      callsByAgent,
      recentCalls: recentCallsRaw.map((call) => toCallAttemptDto(call, lookups)),
    };
  };
}
