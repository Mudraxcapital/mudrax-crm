// ============================================================================
// src/modules/reports/application/use-cases/getCallerLeaderboard.ts
//
// Enterprise Caller Leaderboard — aggregates telephony Call Attempts, Lead
// Stage metadata, Follow-ups, Campaign membership, and User hierarchy.
// Status / outcome labels always come from CRM catalogs (never hardcoded).
// ============================================================================

import { listCampaigns, listCampaignMembers } from "@/modules/campaigns";
import { listFollowUps, OPEN_FOLLOW_UP_STATUSES } from "@/modules/follow-ups";
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
  CallerLeaderboardScope,
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

/**
 * Talk seconds for a call. Prefer stored duration; otherwise estimate from
 * answeredAt → endedAt, or answeredAt → next call start (dialer workflow where
 * agents mark Connected and never Complete).
 */
function resolveTalkSeconds(
  call: CallAttemptDto,
  nextCallInitiatedAt: string | null,
): number | null {
  if (typeof call.durationSeconds === "number" && call.durationSeconds >= 0) {
    return call.durationSeconds;
  }
  if (!call.answeredAt) return null;
  const startMs = new Date(call.answeredAt).getTime();
  if (Number.isNaN(startMs)) return null;

  let endMs: number | null = null;
  if (call.endedAt) {
    endMs = new Date(call.endedAt).getTime();
  } else if (nextCallInitiatedAt) {
    endMs = new Date(nextCallInitiatedAt).getTime();
  }
  if (endMs == null || Number.isNaN(endMs) || endMs < startMs) return null;

  // Cap runaway gaps (e.g. answered yesterday, next call today) at 2 hours.
  return Math.min(Math.round((endMs - startMs) / 1000), 2 * 60 * 60);
}

function formatHighlightValue(
  sortKey: CallerLeaderboardHighlightDto["key"],
  row: CallerLeaderboardRowDto,
): string {
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

function sortRows(
  rows: CallerLeaderboardRowDto[],
  sortBy: CallerLeaderboardSort,
): CallerLeaderboardRowDto[] {
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
      case "most_follow_ups_completed":
        return b.followUpsCompleted - a.followUpsCompleted || b.followUps - a.followUps;
      case "most_won_leads":
        return b.wonLeads - a.wonLeads || b.conversionRate - a.conversionRate;
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
    scope?: CallerLeaderboardScope,
  ): Promise<CallerLeaderboardDto> {
    const range = resolveLeaderboardRange(query.preset, query.dateFrom, query.dateTo, now);
    const scopeIds =
      scope?.visibleUserIds && scope.visibleUserIds.length > 0
        ? scope.visibleUserIds
        : undefined;

    if (query.callerId && scopeIds && !scopeIds.includes(query.callerId)) {
      return {
        dateFrom: range.from.toISOString(),
        dateTo: range.to.toISOString(),
        preset: query.preset,
        sortBy: query.sortBy,
        outcomeColumns: [],
        stageColumns: [],
        highlights: buildHighlights([]),
        rows: [],
      };
    }

    if (query.teamLeadId && scopeIds && !scopeIds.includes(query.teamLeadId)) {
      return {
        dateFrom: range.from.toISOString(),
        dateTo: range.to.toISOString(),
        preset: query.preset,
        sortBy: query.sortBy,
        outcomeColumns: [],
        stageColumns: [],
        highlights: buildHighlights([]),
        rows: [],
      };
    }

    const agentUserIds = query.callerId
      ? [query.callerId]
      : scopeIds;

    const leadAssigneeIds = query.callerId
      ? [query.callerId]
      : scopeIds;

    const [users, stages, lostReasons, outcomes, calls, leads, followUps, campaigns] =
      await Promise.all([
        listUsers({
          status: "ACTIVE",
          teamLeadId: query.teamLeadId,
          userIds: scopeIds,
          limit: 5_000,
        }),
        leadCatalogs.listStages(organizationId),
        leadCatalogs.listLostReasons(organizationId),
        listCallOutcomes(organizationId),
        listCallAttempts(organizationId, {
          initiatedFrom: range.from,
          initiatedTo: range.to,
          limit: 100_000,
          agentUserId: query.callerId,
          agentUserIds: query.callerId ? undefined : agentUserIds,
        }),
        listLeads(organizationId, {
          limit: 100_000,
          campaignId: query.campaignId,
          currentStageId: query.stageId,
          assignedToUserIds: leadAssigneeIds,
        }),
        listFollowUps(organizationId, {
          limit: 100_000,
          assignedToUserIds: leadAssigneeIds,
        }),
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
    const activeLostReasons = lostReasons
      .filter((reason) => reason.isActive)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    let filteredUsers = users;
    if (query.callerId) {
      filteredUsers = filteredUsers.filter((user) => user.id === query.callerId);
    }

    const campaignNameById = new Map(campaigns.map((campaign) => [campaign.id, campaign.name]));
    const membershipByUser = new Map<string, string[]>();

    // Avoid N+1 across every campaign — only resolve membership when filtering,
    // or for campaigns that appear on scoped leads.
    const campaignsToResolve = query.campaignId
      ? campaigns.filter((campaign) => campaign.id === query.campaignId)
      : campaigns.filter((campaign) =>
          leads.some((lead) => lead.campaignId === campaign.id),
        );

    await Promise.all(
      campaignsToResolve.map(async (campaign) => {
        const members = await listCampaignMembers(campaign.id);
        for (const member of members.filter((item) => item.isActive)) {
          if (scopeIds && !scopeIds.includes(member.userId)) continue;
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
      if (scopeIds && !scopeIds.includes(call.agentUserId)) continue;
      if (query.campaignId) {
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
      if (scopeIds && !scopeIds.includes(lead.currentAssigneeUserId)) continue;
      const list = leadsByAssignee.get(lead.currentAssigneeUserId) ?? [];
      list.push(lead);
      leadsByAssignee.set(lead.currentAssigneeUserId, list);
    }

    const followUpsByAssignee = new Map<string, typeof followUps>();
    for (const followUp of followUps) {
      if (scopeIds && !scopeIds.includes(followUp.currentAssigneeUserId)) continue;
      const list = followUpsByAssignee.get(followUp.currentAssigneeUserId) ?? [];
      list.push(followUp);
      followUpsByAssignee.set(followUp.currentAssigneeUserId, list);
    }

    const openFollowUpStatuses = new Set<string>(OPEN_FOLLOW_UP_STATUSES);

    const rows: CallerLeaderboardRowDto[] = filteredUsers.map((user) => {
      const agentCalls = callsByAgent.get(user.id) ?? [];
      const agentLeads = leadsByAssignee.get(user.id) ?? [];
      const agentFollowUps = followUpsByAssignee.get(user.id) ?? [];

      const connectedCalls = agentCalls.filter((call) => CONNECTED_STATUSES.has(call.status)).length;
      const missedCalls = agentCalls.filter((call) => MISSED_STATUSES.has(call.status)).length;
      const notConnectedCalls = missedCalls;
      const incomingCalls = agentCalls.filter((call) => call.direction === "INBOUND").length;
      const outgoingCalls = agentCalls.filter((call) => call.direction === "OUTBOUND").length;
      // Non-connected dials (includes still-RINGING attempts never dispositioned).
      const attemptedCalls = agentCalls.filter((call) => !CONNECTED_STATUSES.has(call.status)).length;

      const callsChronological = [...agentCalls].sort(
        (a, b) => new Date(a.initiatedAt).getTime() - new Date(b.initiatedAt).getTime(),
      );
      const talkSamples: number[] = [];
      for (let index = 0; index < callsChronological.length; index += 1) {
        const call = callsChronological[index]!;
        if (!CONNECTED_STATUSES.has(call.status) && call.durationSeconds == null) {
          continue;
        }
        const next = callsChronological[index + 1] ?? null;
        const talk = resolveTalkSeconds(call, next?.initiatedAt ?? null);
        if (talk != null) talkSamples.push(talk);
      }
      const totalTalkTimeSeconds = talkSamples.reduce((sum, value) => sum + value, 0);
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
      const pendingFollowUps = agentFollowUps.filter((item) =>
        openFollowUpStatuses.has(item.status),
      );
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

      const lossReasonMetrics: NamedMetricDto[] = activeLostReasons.map((reason) => ({
        key: reason.id,
        label: reason.name,
        value: agentLeads.filter((lead) => lead.lostReasonId === reason.id).length,
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

      // Unique customers dialed in the selected date range (calls are already
      // filtered by initiatedFrom/initiatedTo). Do NOT count assigned leads —
      // assignment ≠ contact.
      const contactedKeys = new Set<string>();
      for (const call of agentCalls) {
        if (call.customerId) {
          contactedKeys.add(`customer:${call.customerId}`);
        } else if (call.leadId) {
          contactedKeys.add(`lead:${call.leadId}`);
        }
      }

      const workingHours = Math.max(workingDurationSeconds / 3600, 1 / 60);
      const campaignNames = membershipByUser.get(user.id) ?? [];

      return {
        rank: 0,
        userId: user.id,
        employeeName: user.fullName,
        profilePhotoUrl: user.profilePhotoUrl,
        roleName: user.roleName,
        status: user.status,
        email: user.email,
        teamLeadName: user.assignedTeamLeadName,
        teamLeadId: user.assignedTeamLeadId,
        reportingManagerId: user.reportingManagerId,
        campaignNames,
        primaryCampaignName: campaignNames[0] ?? null,
        totalCalls: agentCalls.length,
        incomingCalls,
        outgoingCalls,
        connectedCalls,
        attemptedCalls,
        notConnectedCalls,
        missedCalls,
        outcomeMetrics,
        stageMetrics,
        lossReasonMetrics,
        interestedLeads,
        followUps: Math.max(agentFollowUps.length, followUpStageLeads),
        followUpsCompleted: completedFollowUps.length,
        followUpsPending: pendingFollowUps.length,
        customersContacted: contactedKeys.size,
        conversions: wonLeads,
        wonLeads,
        lostLeads,
        firstCallAt: firstCallMs != null ? new Date(firstCallMs).toISOString() : null,
        lastCallAt: lastCallMs != null ? new Date(lastCallMs).toISOString() : null,
        workingDurationSeconds,
        totalTalkTimeSeconds,
        averageTalkTimeSeconds: average(talkSamples),
        longestCallSeconds: talkSamples.length > 0 ? Math.max(...talkSamples) : null,
        shortestCallSeconds: talkSamples.length > 0 ? Math.min(...talkSamples) : null,
        idleTimeSeconds,
        callsPerHour: agentCalls.length / workingHours,
        averageResponseTimeSeconds: average(responseTimes),
        averageFollowUpTimeSeconds: average(followUpDurations),
        leadsClosed,
        pendingLeads,
        conversionRate,
      };
    });

    // Keep employees who had activity or assigned leads in scope.
    const activeRows = rows.filter(
      (row) =>
        row.totalCalls > 0 ||
        row.pendingLeads > 0 ||
        row.leadsClosed > 0 ||
        row.followUps > 0,
    );

    // Prefer ranking Callers; include Admins/Team Leads/Managers when they have direct activity.
    const rankedPool = activeRows.filter(
      (row) =>
        row.roleName === "Caller" ||
        row.roleName === "Team Lead" ||
        row.roleName === "Manager" ||
        row.roleName === "Admin" ||
        !row.roleName,
    );
    const ranked = sortRows(rankedPool.length > 0 ? rankedPool : activeRows, query.sortBy);

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
