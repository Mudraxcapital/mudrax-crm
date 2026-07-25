// ============================================================================
// src/modules/reports/application/use-cases/getCallerLeaderboard.ts
//
// Enterprise Caller Leaderboard — aggregates telephony Call Attempts, Lead
// Stage metadata, Follow-ups, Campaign membership, and User hierarchy.
// Status / outcome labels always come from CRM catalogs (never hardcoded).
// ============================================================================

import { listCampaigns, listCampaignMembers } from "@/modules/campaigns";
import { listFollowUps } from "@/modules/follow-ups";
import { leadCatalogs, listLeads } from "@/modules/leads";
import {
  listCallAttempts,
  listCallOutcomes,
  MISSED_CALL_STATUSES,
  type CallAttemptDto,
} from "@/modules/telephony";
import { listUsers } from "@/modules/users";
import type {
  CallerLeaderboardDto,
  CallerLeaderboardHighlightDto,
  CallerLeaderboardRowDto,
  NamedMetricDto,
} from "../dto/CallerLeaderboardDto";
import type {
  CallerLeaderboardQuery,
  CallerLeaderboardSort,
} from "../validators/callerLeaderboardSchemas";
import { resolveLeaderboardRange } from "../services/leaderboardRange";

const CONNECTED_STATUSES = new Set([
  "ANSWERED",
  "ON_HOLD",
  "TRANSFERRING",
  "CONFERENCING",
  "COMPLETED",
]);
const MISSED_STATUSES = new Set<string>(MISSED_CALL_STATUSES);

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatHighlightValue(sortKey: CallerLeaderboardHighlightDto["key"], row: CallerLeaderboardRowDto): string {
  switch (sortKey) {
    case "top_caller":
      return `${row.totalCalls} calls`;
    case "highest_connections":
      return `${row.connectedCalls} connected`;
    case "best_conversion":
      return `${(row.conversionRate * 100).toFixed(1)}%`;
    case "longest_talk":
      return formatDuration(row.totalTalkTimeSeconds);
    default:
      return "";
  }
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rem = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rem}s`;
  return `${rem}s`;
}

function sortRows(rows: CallerLeaderboardRowDto[], sortBy: CallerLeaderboardSort): CallerLeaderboardRowDto[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "most_calls":
        return b.totalCalls - a.totalCalls || b.connectedCalls - a.connectedCalls;
      case "most_connections":
        return b.connectedCalls - a.connectedCalls || b.totalCalls - a.totalCalls;
      case "highest_conversion":
        return b.conversionRate - a.conversionRate || b.wonLeads - a.wonLeads;
      case "longest_talk_time":
        return b.totalTalkTimeSeconds - a.totalTalkTimeSeconds;
      case "fastest_follow_ups": {
        const aTime = a.averageFollowUpTimeSeconds ?? Number.POSITIVE_INFINITY;
        const bTime = b.averageFollowUpTimeSeconds ?? Number.POSITIVE_INFINITY;
        return aTime - bTime || b.followUps - a.followUps;
      }
      default: {
        const _exhaustive: never = sortBy;
        return _exhaustive;
      }
    }
  });
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

function buildHighlights(rows: CallerLeaderboardRowDto[]): CallerLeaderboardHighlightDto[] {
  if (rows.length === 0) {
    return [
      { key: "top_caller", label: "Top Caller", userId: null, employeeName: null, valueLabel: "—" },
      {
        key: "highest_connections",
        label: "Highest Connections",
        userId: null,
        employeeName: null,
        valueLabel: "—",
      },
      {
        key: "best_conversion",
        label: "Best Conversion Rate",
        userId: null,
        employeeName: null,
        valueLabel: "—",
      },
      {
        key: "longest_talk",
        label: "Longest Talk Time",
        userId: null,
        employeeName: null,
        valueLabel: "—",
      },
    ];
  }

  const byCalls = [...rows].sort((a, b) => b.totalCalls - a.totalCalls)[0]!;
  const byConnections = [...rows].sort((a, b) => b.connectedCalls - a.connectedCalls)[0]!;
  const byConversion = [...rows].sort((a, b) => b.conversionRate - a.conversionRate)[0]!;
  const byTalk = [...rows].sort((a, b) => b.totalTalkTimeSeconds - a.totalTalkTimeSeconds)[0]!;

  return [
    {
      key: "top_caller",
      label: "Top Caller",
      userId: byCalls.userId,
      employeeName: byCalls.employeeName,
      valueLabel: formatHighlightValue("top_caller", byCalls),
    },
    {
      key: "highest_connections",
      label: "Highest Connections",
      userId: byConnections.userId,
      employeeName: byConnections.employeeName,
      valueLabel: formatHighlightValue("highest_connections", byConnections),
    },
    {
      key: "best_conversion",
      label: "Best Conversion Rate",
      userId: byConversion.userId,
      employeeName: byConversion.employeeName,
      valueLabel: formatHighlightValue("best_conversion", byConversion),
    },
    {
      key: "longest_talk",
      label: "Longest Talk Time",
      userId: byTalk.userId,
      employeeName: byTalk.employeeName,
      valueLabel: formatHighlightValue("longest_talk", byTalk),
    },
  ];
}

/** Heuristic bucket helpers — match against CRM stage names, never a fixed enum. */
function stageLooksLike(name: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(name));
}

export function makeGetCallerLeaderboard() {
  return async function getCallerLeaderboard(
    organizationId: string,
    query: CallerLeaderboardQuery,
    now: Date = new Date(),
  ): Promise<CallerLeaderboardDto> {
    const range = resolveLeaderboardRange(query.preset, query.dateFrom, query.dateTo, now);

    const [users, stages, outcomes, calls, leads, followUps, campaigns] = await Promise.all([
      listUsers({
        status: "ACTIVE",
        teamLeadId: query.teamLeadId,
        limit: 5_000,
      }),
      leadCatalogs.listStages(organizationId),
      listCallOutcomes(organizationId),
      listCallAttempts(organizationId, {
        initiatedFrom: range.from,
        initiatedTo: range.to,
        limit: 100_000,
        agentUserId: query.callerId,
      }),
      listLeads(organizationId, {
        limit: 100_000,
        campaignId: query.campaignId,
        currentStageId: query.stageId,
        assignedToUserIds: query.callerId ? [query.callerId] : undefined,
      }),
      listFollowUps(organizationId, { limit: 100_000 }),
      listCampaigns(organizationId),
    ]);

    const activeOutcomes = outcomes
      .filter((outcome) => outcome.isActive)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const activeStages = stages
      .filter((stage) => stage.isActive)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    let filteredUsers = users;
    if (query.callerId) {
      filteredUsers = filteredUsers.filter((user) => user.id === query.callerId);
    }

    const campaignNameById = new Map(campaigns.map((campaign) => [campaign.id, campaign.name]));
    const membershipByUser = new Map<string, string[]>();
    await Promise.all(
      campaigns.map(async (campaign) => {
        const members = await listCampaignMembers(campaign.id);
        for (const member of members.filter((item) => item.isActive)) {
          const names = membershipByUser.get(member.userId) ?? [];
          names.push(campaign.name);
          membershipByUser.set(member.userId, names);
        }
      }),
    );

    if (query.campaignId) {
      const campaignName = campaignNameById.get(query.campaignId);
      filteredUsers = filteredUsers.filter((user) =>
        (membershipByUser.get(user.id) ?? []).includes(campaignName ?? ""),
      );
    }

    const callsByAgent = new Map<string, CallAttemptDto[]>();
    for (const call of calls) {
      if (!call.agentUserId) continue;
      if (query.campaignId) {
        // Prefer campaign filter via lead linkage when present.
        // Calls without leadId still count for the agent if they are a campaign member.
        const memberNames = membershipByUser.get(call.agentUserId) ?? [];
        const campaignName = campaignNameById.get(query.campaignId);
        if (campaignName && !memberNames.includes(campaignName)) continue;
      }
      const list = callsByAgent.get(call.agentUserId) ?? [];
      list.push(call);
      callsByAgent.set(call.agentUserId, list);
    }

    const leadsByAssignee = new Map<string, typeof leads>();
    for (const lead of leads) {
      if (!lead.currentAssigneeUserId) continue;
      const list = leadsByAssignee.get(lead.currentAssigneeUserId) ?? [];
      list.push(lead);
      leadsByAssignee.set(lead.currentAssigneeUserId, list);
    }

    const followUpsByAssignee = new Map<string, typeof followUps>();
    for (const followUp of followUps) {
      const list = followUpsByAssignee.get(followUp.currentAssigneeUserId) ?? [];
      list.push(followUp);
      followUpsByAssignee.set(followUp.currentAssigneeUserId, list);
    }

    const rows: CallerLeaderboardRowDto[] = filteredUsers.map((user) => {
      const agentCalls = callsByAgent.get(user.id) ?? [];
      const agentLeads = leadsByAssignee.get(user.id) ?? [];
      const agentFollowUps = followUpsByAssignee.get(user.id) ?? [];

      const connectedCalls = agentCalls.filter((call) => CONNECTED_STATUSES.has(call.status)).length;
      const notConnectedCalls = agentCalls.filter((call) =>
        MISSED_STATUSES.has(call.status),
      ).length;
      const durations = agentCalls
        .map((call) => call.durationSeconds)
        .filter((value): value is number => typeof value === "number" && value >= 0);
      const totalTalkTimeSeconds = durations.reduce((sum, value) => sum + value, 0);
      const initiatedTimes = agentCalls
        .map((call) => new Date(call.initiatedAt).getTime())
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b);
      const firstCallMs = initiatedTimes[0] ?? null;
      const lastCallMs = initiatedTimes[initiatedTimes.length - 1] ?? null;
      const workingDurationSeconds =
        firstCallMs != null && lastCallMs != null
          ? Math.max(0, Math.round((lastCallMs - firstCallMs) / 1000))
          : 0;
      const idleTimeSeconds = Math.max(0, workingDurationSeconds - totalTalkTimeSeconds);

      const responseTimes = agentCalls
        .filter((call) => call.answeredAt)
        .map((call) => {
          const answered = new Date(call.answeredAt!).getTime();
          const initiated = new Date(call.initiatedAt).getTime();
          return Math.max(0, (answered - initiated) / 1000);
        });

      const completedFollowUps = agentFollowUps.filter((item) => item.status === "COMPLETED");
      const followUpDurations = completedFollowUps
        .filter((item) => item.completedAt && item.scheduledFor)
        .map((item) => {
          const completed = new Date(item.completedAt!).getTime();
          const scheduled = new Date(item.scheduledFor).getTime();
          return Math.max(0, (completed - scheduled) / 1000);
        });

      const outcomeMetrics: NamedMetricDto[] = activeOutcomes.map((outcome) => ({
        key: outcome.id,
        label: outcome.name,
        value: agentCalls.filter((call) => call.callOutcomeId === outcome.id).length,
      }));

      const stageMetrics: NamedMetricDto[] = activeStages.map((stage) => ({
        key: stage.id,
        label: stage.name,
        value: agentLeads.filter((lead) => lead.currentStageId === stage.id).length,
      }));

      const wonLeads = agentLeads.filter((lead) => lead.currentStageBucket === "CLOSED" && lead.wonAt)
        .length;
      const lostLeads = agentLeads.filter(
        (lead) => lead.currentStageBucket === "CLOSED" && lead.lostAt,
      ).length;
      const pendingLeads = agentLeads.filter((lead) => lead.currentStageBucket !== "CLOSED").length;
      const leadsClosed = wonLeads + lostLeads;
      const interestedLeads = agentLeads.filter((lead) =>
        stageLooksLike(lead.currentStageName, [/interest/i, /hot/i, /qualif/i]),
      ).length;
      const followUpStageLeads = agentLeads.filter((lead) =>
        stageLooksLike(lead.currentStageName, [/follow/i, /callback/i, /ring/i]),
      ).length;
      const conversionRate =
        agentLeads.length > 0 ? wonLeads / agentLeads.length : agentCalls.length > 0 ? 0 : 0;

      const workingHours = Math.max(workingDurationSeconds / 3600, 1 / 60);
      const campaignNames = membershipByUser.get(user.id) ?? [];

      return {
        rank: 0,
        userId: user.id,
        employeeName: user.fullName,
        profilePhotoUrl: user.profilePhotoUrl,
        teamLeadName: user.assignedTeamLeadName,
        teamLeadId: user.assignedTeamLeadId,
        campaignNames,
        primaryCampaignName: campaignNames[0] ?? null,
        totalCalls: agentCalls.length,
        connectedCalls,
        notConnectedCalls,
        outcomeMetrics,
        stageMetrics,
        interestedLeads,
        followUps: Math.max(agentFollowUps.length, followUpStageLeads),
        conversions: wonLeads,
        wonLeads,
        lostLeads,
        firstCallAt: firstCallMs != null ? new Date(firstCallMs).toISOString() : null,
        lastCallAt: lastCallMs != null ? new Date(lastCallMs).toISOString() : null,
        workingDurationSeconds,
        totalTalkTimeSeconds,
        averageTalkTimeSeconds: average(durations),
        longestCallSeconds: durations.length > 0 ? Math.max(...durations) : null,
        shortestCallSeconds: durations.length > 0 ? Math.min(...durations) : null,
        idleTimeSeconds,
        callsPerHour: agentCalls.length / workingHours,
        averageResponseTimeSeconds: average(responseTimes),
        averageFollowUpTimeSeconds: average(followUpDurations),
        leadsClosed,
        pendingLeads,
        conversionRate,
      };
    });

    // Keep callers who had activity or assigned leads in scope.
    const activeRows = rows.filter(
      (row) => row.totalCalls > 0 || row.pendingLeads > 0 || row.leadsClosed > 0,
    );
    const ranked = sortRows(activeRows, query.sortBy);

    return {
      dateFrom: range.from.toISOString(),
      dateTo: range.to.toISOString(),
      preset: query.preset,
      sortBy: query.sortBy,
      outcomeColumns: activeOutcomes.map((outcome) => ({
        key: outcome.id,
        label: outcome.name,
      })),
      stageColumns: activeStages.map((stage) => ({
        key: stage.id,
        label: stage.name,
      })),
      highlights: buildHighlights(ranked),
      rows: ranked,
    };
  };
}
