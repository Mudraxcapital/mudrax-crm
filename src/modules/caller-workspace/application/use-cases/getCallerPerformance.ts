// ============================================================================
// src/modules/caller-workspace/application/use-cases/getCallerPerformance.ts
//
// Own-only performance for the logged-in Caller. Never aggregates other Users.
// ============================================================================

import { listLeads, leadCatalogs } from "@/modules/leads";
import { listCallAttempts, listCallOutcomes } from "@/modules/telephony";
import type {
  CallerOutcomeCountDto,
  CallerPerformanceDto,
  CallerTimeMetricsDto,
} from "../dto/CallerWorkspaceDto";

const CONNECTED = new Set(["ANSWERED", "ON_HOLD", "TRANSFERRING", "CONFERENCING", "COMPLETED"]);
const NOT_CONNECTED = new Set(["NO_ANSWER", "BUSY", "FAILED", "ABANDONED"]);

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function matchesName(name: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(name));
}

export interface GetCallerPerformanceQuery {
  organizationId: string;
  callerUserId: string;
  loginAt: string;
  campaignId?: string | null;
  now?: Date;
}

export function makeGetCallerPerformance() {
  return async function getCallerPerformance(
    query: GetCallerPerformanceQuery,
  ): Promise<CallerPerformanceDto> {
    const now = query.now ?? new Date();
    const today = startOfToday();
    const loginAt = query.loginAt ? new Date(query.loginAt) : null;

    const [calls, leads, stages, outcomes] = await Promise.all([
      listCallAttempts(query.organizationId, {
        agentUserId: query.callerUserId,
        initiatedFrom: today,
        limit: 10_000,
      }),
      listLeads(query.organizationId, {
        assignedToUserIds: [query.callerUserId],
        campaignId: query.campaignId ?? undefined,
        limit: 10_000,
      }),
      leadCatalogs.listStages(query.organizationId),
      listCallOutcomes(query.organizationId),
    ]);

    const leadIds = new Set(leads.map((lead) => lead.id));
    const scopedCalls = query.campaignId
      ? calls.filter((call) => !call.leadId || leadIds.has(call.leadId))
      : calls;

    const stageById = new Map(stages.map((stage) => [stage.id, stage]));
    const outcomeById = new Map(outcomes.map((outcome) => [outcome.id, outcome]));

    let interested = 0;
    let followUp = 0;
    let won = 0;
    let lost = 0;
    let rejected = 0;
    let busy = 0;
    let switchedOff = 0;
    let wrongNumber = 0;

    for (const lead of leads) {
      const stage = stageById.get(lead.currentStageId);
      const name = stage?.name ?? lead.currentStageName;
      if (matchesName(name, [/interest/i])) interested += 1;
      if (matchesName(name, [/follow.?up/i])) followUp += 1;
      if (stage?.bucket === "CLOSED" && matchesName(name, [/won|convert/i])) won += 1;
      if (stage?.bucket === "CLOSED" && matchesName(name, [/lost/i])) lost += 1;
      if (matchesName(name, [/reject/i])) rejected += 1;
    }

    for (const call of scopedCalls) {
      if (call.status === "BUSY" || call.disposition === "BUSY") busy += 1;
      const outcomeName = call.callOutcomeId
        ? (outcomeById.get(call.callOutcomeId)?.name ?? call.callOutcomeName ?? "")
        : (call.callOutcomeName ?? "");
      if (matchesName(outcomeName, [/switch|power.?off|switched.?off/i])) switchedOff += 1;
      if (matchesName(outcomeName, [/wrong.?number|invalid.?number/i])) wrongNumber += 1;
      if (matchesName(outcomeName, [/interest/i])) interested += 1;
      if (matchesName(outcomeName, [/follow.?up|call.?back/i])) followUp += 1;
      if (matchesName(outcomeName, [/reject|not interest/i])) rejected += 1;
    }

    const connected = scopedCalls.filter((call) => CONNECTED.has(call.status)).length;
    const notConnected = scopedCalls.filter((call) => NOT_CONNECTED.has(call.status)).length;

    const cards: CallerOutcomeCountDto[] = [
      { key: "calls_today", label: "Today's Calls", count: scopedCalls.length },
      { key: "connected", label: "Connected", count: connected },
      { key: "not_connected", label: "Not Connected", count: notConnected },
      { key: "interested", label: "Interested", count: interested },
      { key: "follow_up", label: "Follow Up", count: followUp },
      { key: "won", label: "Won", count: won },
      { key: "lost", label: "Lost", count: lost },
      { key: "rejected", label: "Rejected", count: rejected },
      { key: "busy", label: "Busy", count: busy },
      { key: "switched_off", label: "Switched Off", count: switchedOff },
      { key: "wrong_number", label: "Wrong Number", count: wrongNumber },
    ];

    const durations = scopedCalls
      .map((call) => call.durationSeconds)
      .filter((value): value is number => typeof value === "number" && value >= 0);
    const totalTalk = durations.reduce((sum, value) => sum + value, 0);
    const initiated = scopedCalls
      .map((call) => new Date(call.initiatedAt).getTime())
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b);

    const firstCallMs = initiated[0] ?? null;
    const lastCallMs = initiated.length ? initiated[initiated.length - 1]! : null;
    const sessionStart = loginAt && !Number.isNaN(loginAt.getTime()) ? loginAt : today;
    const currentSessionSeconds = Math.max(
      0,
      Math.floor((now.getTime() - sessionStart.getTime()) / 1000),
    );
    // Absolute session window today ≈ current session (JWT loginAt resets each login).
    const totalLoginSecondsToday = currentSessionSeconds;
    const hoursActive =
      firstCallMs != null && lastCallMs != null && lastCallMs > firstCallMs
        ? (lastCallMs - firstCallMs) / 3_600_000
        : currentSessionSeconds / 3600;

    const timeMetrics: CallerTimeMetricsDto = {
      loginAt: sessionStart.toISOString(),
      firstCallAt: firstCallMs != null ? new Date(firstCallMs).toISOString() : null,
      lastCallAt: lastCallMs != null ? new Date(lastCallMs).toISOString() : null,
      currentSessionSeconds,
      totalLoginSecondsToday,
      totalTalkTimeSeconds: totalTalk,
      averageCallDurationSeconds:
        durations.length > 0 ? Math.round(totalTalk / durations.length) : null,
      longestCallSeconds: durations.length > 0 ? Math.max(...durations) : null,
      callsPerHour:
        hoursActive > 0.05 ? Math.round((scopedCalls.length / hoursActive) * 10) / 10 : null,
    };

    return {
      campaignId: query.campaignId ?? null,
      cards,
      timeMetrics,
    };
  };
}
