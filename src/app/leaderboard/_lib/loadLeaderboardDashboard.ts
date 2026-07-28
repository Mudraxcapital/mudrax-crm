// ============================================================================
// Leaderboard composition root — hierarchy-scoped, reuses reports/telephony/
// leads/follow-ups/users public APIs. No schema or RBAC changes.
// ============================================================================

import { listCampaigns } from "@/modules/campaigns";
import { countCallAttempts, listCallAttempts } from "@/modules/telephony";
import { listLeads } from "@/modules/leads";
import {
  getCallerLeaderboard,
  resolveLeaderboardRange,
  type CallerLeaderboardQuery,
  type CallerLeaderboardRowDto,
} from "@/modules/reports";
import { canViewUserId, type AuthorizationContext } from "@/modules/rbac";
import { listUsers, type UserListItemDto } from "@/modules/users";
import { managerBookFilter } from "@/shared/auth/applyHierarchyListFilter";
import type {
  LeaderboardCardDto,
  LeaderboardDetailDto,
  LeaderboardEntityKind,
  LeaderboardMetricTriplet,
  LeaderboardPageDto,
  LeaderboardSummaryStats,
  LeaderboardViewerRole,
  NamedCount,
} from "./leaderboardTypes";
import type { LeaderboardPageQuery } from "./parseLeaderboardQuery";

function emptyMetrics(): LeaderboardMetricTriplet {
  return {
    totalCalls: 0,
    connectedCalls: 0,
    talkTimeSeconds: 0,
    wonLeads: 0,
    conversionRate: 0,
    followUpsCompleted: 0,
    customersContacted: 0,
  };
}

function rollupRows(rows: CallerLeaderboardRowDto[]): LeaderboardMetricTriplet {
  if (rows.length === 0) return emptyMetrics();
  const totalCalls = rows.reduce((sum, row) => sum + row.totalCalls, 0);
  const connectedCalls = rows.reduce((sum, row) => sum + row.connectedCalls, 0);
  const talkTimeSeconds = rows.reduce((sum, row) => sum + row.totalTalkTimeSeconds, 0);
  const wonLeads = rows.reduce((sum, row) => sum + row.wonLeads, 0);
  const followUpsCompleted = rows.reduce((sum, row) => sum + row.followUpsCompleted, 0);
  const customersContacted = rows.reduce((sum, row) => sum + row.customersContacted, 0);
  const leadDenom = rows.reduce(
    (sum, row) => sum + row.wonLeads + row.lostLeads + row.pendingLeads,
    0,
  );
  return {
    totalCalls,
    connectedCalls,
    talkTimeSeconds,
    wonLeads,
    conversionRate: leadDenom > 0 ? wonLeads / leadDenom : 0,
    followUpsCompleted,
    customersContacted,
  };
}

function sortMetricValue(metrics: LeaderboardMetricTriplet, sortBy: string): number {
  switch (sortBy) {
    case "most_calls":
      return metrics.totalCalls;
    case "highest_conversion":
      return metrics.conversionRate;
    case "longest_talk_time":
      return metrics.talkTimeSeconds;
    case "most_follow_ups_completed":
      return metrics.followUpsCompleted;
    case "most_won_leads":
      return metrics.wonLeads;
    case "most_connections":
    default:
      return metrics.connectedCalls;
  }
}

function rankCards(cards: LeaderboardCardDto[], sortBy: string): LeaderboardCardDto[] {
  const ranked = [...cards].sort(
    (a, b) =>
      sortMetricValue(b.metrics, sortBy) - sortMetricValue(a.metrics, sortBy) ||
      a.name.localeCompare(b.name),
  );
  return ranked.map((card, index) => ({
    ...card,
    rank: card.kind === "summary" ? null : index + 1,
  }));
}

function viewerRoleOf(auth: AuthorizationContext): LeaderboardViewerRole {
  const role = auth.hierarchy.primaryRole;
  if (role === "Admin" || role === "Manager" || role === "Team Lead" || role === "Caller") {
    return role;
  }
  return "Caller";
}

function rowsForMembers(
  rowByUserId: Map<string, CallerLeaderboardRowDto>,
  memberIds: string[],
): CallerLeaderboardRowDto[] {
  return memberIds
    .map((id) => rowByUserId.get(id))
    .filter((row): row is CallerLeaderboardRowDto => !!row);
}

function buildSummaryStats(
  rows: CallerLeaderboardRowDto[],
  periodCounts: { today: number; week: number; month: number },
): LeaderboardSummaryStats {
  const totalCalls = rows.reduce((sum, row) => sum + row.totalCalls, 0);
  const incomingCalls = rows.reduce((sum, row) => sum + row.incomingCalls, 0);
  const outgoingCalls = rows.reduce((sum, row) => sum + row.outgoingCalls, 0);
  const connectedCalls = rows.reduce((sum, row) => sum + row.connectedCalls, 0);
  const attemptedCalls = rows.reduce((sum, row) => sum + row.attemptedCalls, 0);
  const missedCalls = rows.reduce((sum, row) => sum + row.missedCalls, 0);
  const totalTalkTimeSeconds = rows.reduce((sum, row) => sum + row.totalTalkTimeSeconds, 0);
  const followUpsCompleted = rows.reduce((sum, row) => sum + row.followUpsCompleted, 0);
  const pendingFollowUps = rows.reduce((sum, row) => sum + row.followUpsPending, 0);
  const customersContacted = rows.reduce((sum, row) => sum + row.customersContacted, 0);
  const leadsConverted = rows.reduce((sum, row) => sum + row.wonLeads, 0);
  const leadDenom = rows.reduce(
    (sum, row) => sum + row.wonLeads + row.lostLeads + row.pendingLeads,
    0,
  );
  const talkSamples = rows
    .map((row) => row.averageTalkTimeSeconds)
    .filter((value): value is number => value != null);
  const averageCallDurationSeconds =
    talkSamples.length > 0
      ? talkSamples.reduce((sum, value) => sum + value, 0) / talkSamples.length
      : totalTalkTimeSeconds > 0 && totalCalls > 0
        ? totalTalkTimeSeconds / totalCalls
        : null;

  return {
    totalCalls,
    incomingCalls,
    outgoingCalls,
    connectedCalls,
    attemptedCalls,
    missedCalls,
    averageCallDurationSeconds,
    totalTalkTimeSeconds,
    callsToday: periodCounts.today,
    callsThisWeek: periodCounts.week,
    callsThisMonth: periodCounts.month,
    followUpsCompleted,
    pendingFollowUps,
    customersContacted,
    leadsConverted,
    conversionRate: leadDenom > 0 ? leadsConverted / leadDenom : 0,
  };
}

function mergeNamedCounts(
  rows: CallerLeaderboardRowDto[],
  pick: (row: CallerLeaderboardRowDto) => Array<{ key: string; label: string; value: number }>,
): NamedCount[] {
  const map = new Map<string, NamedCount>();
  for (const row of rows) {
    for (const item of pick(row)) {
      const existing = map.get(item.key);
      if (existing) {
        existing.count += item.value;
      } else {
        map.set(item.key, { key: item.key, label: item.label, count: item.value });
      }
    }
  }
  return [...map.values()]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildFunnel(stageDistribution: NamedCount[], stagesByBucketHint: NamedCount[]): NamedCount[] {
  if (stagesByBucketHint.length > 0) return stagesByBucketHint;
  return stageDistribution.slice(0, 8);
}

async function loadPeriodCallCounts(
  organizationId: string,
  agentUserIds: string[] | undefined,
  now: Date,
): Promise<{ today: number; week: number; month: number }> {
  const todayRange = resolveLeaderboardRange("today", undefined, undefined, now);
  const weekRange = resolveLeaderboardRange("this_week", undefined, undefined, now);
  const monthRange = resolveLeaderboardRange("this_month", undefined, undefined, now);
  const agentFilter =
    agentUserIds && agentUserIds.length === 1
      ? { agentUserId: agentUserIds[0] }
      : agentUserIds && agentUserIds.length > 1
        ? { agentUserIds }
        : {};

  const [today, week, month] = await Promise.all([
    countCallAttempts(organizationId, {
      ...agentFilter,
      initiatedFrom: todayRange.from,
      initiatedTo: todayRange.to,
    }),
    countCallAttempts(organizationId, {
      ...agentFilter,
      initiatedFrom: weekRange.from,
      initiatedTo: weekRange.to,
    }),
    countCallAttempts(organizationId, {
      ...agentFilter,
      initiatedFrom: monthRange.from,
      initiatedTo: monthRange.to,
    }),
  ]);

  return { today, week, month };
}

function matchesSearch(card: LeaderboardCardDto, q: string | undefined): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    card.name.toLowerCase().includes(needle) ||
    card.designation.toLowerCase().includes(needle)
  );
}

export async function loadLeaderboardDashboard(input: {
  authContext: AuthorizationContext;
  query: LeaderboardPageQuery;
  isCallerOnly: boolean;
  now?: Date;
}): Promise<LeaderboardPageDto> {
  const now = input.now ?? new Date();
  const { authContext, query, isCallerOnly } = input;
  const organizationId = authContext.organizationId;
  const hierarchy = authContext.hierarchy;
  const viewerRole = viewerRoleOf(authContext);
  const visibleUserIds = hierarchy.visibleUserIds;

  // Callers are forced to self — never accept another employee id from the URL.
  const safeQuery: CallerLeaderboardQuery = {
    preset: query.preset,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    campaignId: query.campaignId,
    teamLeadId:
      query.teamLeadId && canViewUserId(hierarchy, query.teamLeadId)
        ? query.teamLeadId
        : undefined,
    callerId: isCallerOnly
      ? authContext.userId
      : query.callerId && canViewUserId(hierarchy, query.callerId)
        ? query.callerId
        : undefined,
    stageId: query.stageId,
    sortBy: query.sortBy,
  };

  const book = managerBookFilter(authContext);

  const [leaderboard, roster, campaigns] = await Promise.all([
    getCallerLeaderboard(organizationId, safeQuery, now, {
      visibleUserIds: isCallerOnly
        ? [authContext.userId]
        : (visibleUserIds ?? null),
    }),
    listUsers({
      status: "ACTIVE",
      userIds: isCallerOnly
        ? [authContext.userId]
        : (visibleUserIds ?? undefined),
      limit: 5_000,
    }),
    listCampaigns(organizationId, book),
  ]);

  const rowByUserId = new Map(leaderboard.rows.map((row) => [row.userId, row]));
  const userById = new Map(roster.map((user) => [user.id, user]));

  const managers = roster.filter((user) => user.roleName === "Manager");
  const teamLeads = roster.filter((user) => user.roleName === "Team Lead");
  const callers = roster.filter((user) => user.roleName === "Caller");

  // Resolve drill target (must be visible).
  let drillId =
    query.drill && canViewUserId(hierarchy, query.drill) ? query.drill : null;
  if (isCallerOnly) drillId = null;

  const drillUser = drillId ? userById.get(drillId) : null;
  const drillRole = drillUser?.roleName ?? null;

  // Members visible in the current left-panel context.
  let contextCallers: UserListItemDto[] = callers;
  let contextTeamLeads: UserListItemDto[] = teamLeads;
  let contextManagers: UserListItemDto[] = managers;
  let summaryKind: LeaderboardEntityKind = "summary";
  let summaryName = "Organization Summary";
  let summaryDesignation = "All teams";
  let summaryMemberIds = callers.map((user) => user.id);

  if (viewerRole === "Caller" || isCallerOnly) {
    contextManagers = [];
    contextTeamLeads = [];
    contextCallers = callers.filter((user) => user.id === authContext.userId);
    summaryKind = "caller";
    summaryName = contextCallers[0]?.fullName ?? "My Performance";
    summaryDesignation = "Caller";
    summaryMemberIds = [authContext.userId];
  } else if (viewerRole === "Team Lead") {
    contextManagers = [];
    contextTeamLeads = [];
    summaryName = "Team Summary";
    summaryDesignation = "My callers";
    summaryMemberIds = callers.map((user) => user.id);
  } else if (viewerRole === "Manager") {
    contextManagers = [];
    summaryName = "Manager Summary";
    summaryDesignation = "My hierarchy";
    if (drillRole === "Team Lead" && drillUser) {
      contextTeamLeads = [];
      contextCallers = callers.filter((user) => user.assignedTeamLeadId === drillUser.id);
      summaryName = `${drillUser.fullName}'s Team`;
      summaryDesignation = "Team Lead";
      summaryMemberIds = contextCallers.map((user) => user.id);
    }
  } else if (viewerRole === "Admin") {
    if (drillRole === "Manager" && drillUser) {
      contextManagers = [];
      contextTeamLeads = teamLeads.filter(
        (user) => user.reportingManagerId === drillUser.id,
      );
      const tlIds = new Set(contextTeamLeads.map((user) => user.id));
      contextCallers = callers.filter(
        (user) =>
          (user.assignedTeamLeadId && tlIds.has(user.assignedTeamLeadId)) ||
          user.reportingManagerId === drillUser.id,
      );
      summaryName = `${drillUser.fullName}'s Hierarchy`;
      summaryDesignation = "Manager";
      summaryMemberIds = contextCallers.map((user) => user.id);
    } else if (drillRole === "Team Lead" && drillUser) {
      contextManagers = [];
      contextTeamLeads = [];
      contextCallers = callers.filter((user) => user.assignedTeamLeadId === drillUser.id);
      summaryName = `${drillUser.fullName}'s Team`;
      summaryDesignation = "Team Lead";
      summaryMemberIds = contextCallers.map((user) => user.id);
    }
  }

  // Team / campaign query filters must also narrow the left-panel roster.
  // getCallerLeaderboard already scopes metrics; without this the UI still lists everyone.
  if (!isCallerOnly && safeQuery.teamLeadId) {
    const filteredLead = userById.get(safeQuery.teamLeadId);
    contextManagers = [];
    // Summary already represents this team — skip a duplicate TL card.
    contextTeamLeads = [];
    contextCallers = contextCallers.filter(
      (user) => user.assignedTeamLeadId === safeQuery.teamLeadId,
    );
    summaryMemberIds = contextCallers.map((user) => user.id);
    if (filteredLead) {
      summaryName = `${filteredLead.fullName}'s Team`;
      summaryDesignation = "Team filter";
    }
  }

  if (!isCallerOnly && safeQuery.campaignId) {
    const scopedIds = new Set(leaderboard.rows.map((row) => row.userId));
    contextCallers = contextCallers.filter((user) => scopedIds.has(user.id));
    contextTeamLeads = contextTeamLeads.filter(
      (lead) =>
        scopedIds.has(lead.id) ||
        contextCallers.some((caller) => caller.assignedTeamLeadId === lead.id),
    );
    contextManagers = contextManagers.filter((manager) => {
      const tls = teamLeads.filter((user) => user.reportingManagerId === manager.id);
      const tlIds = new Set(tls.map((user) => user.id));
      return (
        scopedIds.has(manager.id) ||
        contextCallers.some(
          (caller) =>
            (caller.assignedTeamLeadId != null && tlIds.has(caller.assignedTeamLeadId)) ||
            caller.reportingManagerId === manager.id,
        )
      );
    });
    summaryMemberIds = summaryMemberIds.filter((id) => scopedIds.has(id));
    if (summaryMemberIds.length === 0) {
      summaryMemberIds = contextCallers.map((user) => user.id);
    }
    if (!safeQuery.teamLeadId && !drillId) {
      const campaignName =
        campaigns.find((campaign) => campaign.id === safeQuery.campaignId)?.name ?? "Campaign";
      summaryDesignation = campaignName;
    }
  }

  const summaryMetrics = rollupRows(rowsForMembers(rowByUserId, summaryMemberIds));
  const summaryCard: LeaderboardCardDto = {
    id: "summary",
    kind: summaryKind,
    name: summaryName,
    designation: summaryDesignation,
    rank: null,
    teamSize: summaryMemberIds.length,
    profilePhotoUrl: null,
    metrics: summaryMetrics,
    memberUserIds: summaryMemberIds,
  };

  const managerCards: LeaderboardCardDto[] = contextManagers.map((manager) => {
    const tls = teamLeads.filter((user) => user.reportingManagerId === manager.id);
    const tlIds = new Set(tls.map((user) => user.id));
    const memberIds = contextCallers
      .filter(
        (user) =>
          (user.assignedTeamLeadId && tlIds.has(user.assignedTeamLeadId)) ||
          user.reportingManagerId === manager.id,
      )
      .map((user) => user.id);
    return {
      id: manager.id,
      kind: "manager" as const,
      name: `${manager.fullName}'s Team`,
      designation: "Manager",
      rank: null,
      teamSize: memberIds.length,
      profilePhotoUrl: manager.profilePhotoUrl,
      metrics: rollupRows(rowsForMembers(rowByUserId, memberIds)),
      memberUserIds: memberIds,
    };
  });

  const teamLeadCards: LeaderboardCardDto[] = contextTeamLeads.map((lead) => {
    const memberIds = contextCallers
      .filter((user) => user.assignedTeamLeadId === lead.id)
      .map((user) => user.id);
    return {
      id: lead.id,
      kind: "team_lead" as const,
      name: `${lead.fullName}'s Team`,
      designation: "Team Lead",
      rank: null,
      teamSize: memberIds.length,
      profilePhotoUrl: lead.profilePhotoUrl,
      metrics: rollupRows(rowsForMembers(rowByUserId, memberIds)),
      memberUserIds: memberIds,
    };
  });

  // Admin / Manager / Team Lead can open their own statistics without leaving the hierarchy view.
  const selfUser = userById.get(authContext.userId);
  const selfRow = rowByUserId.get(authContext.userId);
  const showOwnStats =
    !safeQuery.teamLeadId &&
    (!safeQuery.campaignId || rowByUserId.has(authContext.userId));
  const ownStatsCard: LeaderboardCardDto | null =
    !isCallerOnly &&
    showOwnStats &&
    (viewerRole === "Admin" || viewerRole === "Team Lead" || viewerRole === "Manager") &&
    selfUser &&
    !drillId
      ? {
          id: selfUser.id,
          kind: viewerRole === "Team Lead" ? "team_lead" : "manager",
          name: selfUser.fullName,
          designation: viewerRole,
          rank: selfRow?.rank ?? null,
          teamSize: null,
          profilePhotoUrl: selfUser.profilePhotoUrl,
          metrics: selfRow
            ? {
                totalCalls: selfRow.totalCalls,
                connectedCalls: selfRow.connectedCalls,
                talkTimeSeconds: selfRow.totalTalkTimeSeconds,
                wonLeads: selfRow.wonLeads,
                conversionRate: selfRow.conversionRate,
                followUpsCompleted: selfRow.followUpsCompleted,
                customersContacted: selfRow.customersContacted,
              }
            : emptyMetrics(),
          memberUserIds: [selfUser.id],
        }
      : null;

  const callerCards: LeaderboardCardDto[] = contextCallers.map((caller) => {
    const row = rowByUserId.get(caller.id);
    return {
      id: caller.id,
      kind: "caller" as const,
      name: caller.fullName,
      designation: "Caller",
      rank: row?.rank ?? null,
      teamSize: null,
      profilePhotoUrl: caller.profilePhotoUrl,
      metrics: row
        ? {
            totalCalls: row.totalCalls,
            connectedCalls: row.connectedCalls,
            talkTimeSeconds: row.totalTalkTimeSeconds,
            wonLeads: row.wonLeads,
            conversionRate: row.conversionRate,
            followUpsCompleted: row.followUpsCompleted,
            customersContacted: row.customersContacted,
          }
        : emptyMetrics(),
      memberUserIds: [caller.id],
    };
  });

  // Left panel order: summary → managers → team leads → callers (role-dependent).
  const rankedManagers = rankCards(managerCards, query.sortBy);
  const rankedTeamLeads = rankCards(teamLeadCards, query.sortBy);
  const rankedCallers = rankCards(callerCards, query.sortBy);

  let cards: LeaderboardCardDto[] = [
    summaryCard,
    ...(ownStatsCard ? [ownStatsCard] : []),
    ...rankedManagers,
    ...rankedTeamLeads,
    ...rankedCallers,
  ];

  if (isCallerOnly) {
    cards = [
      {
        ...summaryCard,
        id: authContext.userId,
        kind: "caller",
        rank: rankedCallers[0]?.rank ?? 1,
        profilePhotoUrl: contextCallers[0]?.profilePhotoUrl ?? null,
      },
    ];
  }

  cards = cards.filter((card) => matchesSearch(card, query.q));

  // Resolve selected card — callers locked to self.
  let selectedId = isCallerOnly
    ? authContext.userId
    : query.selected;
  let selectedCard =
    cards.find((card) => card.id === selectedId) ??
    cards.find((card) => card.id === "summary") ??
    cards[0];

  if (!selectedCard) {
    selectedCard = summaryCard;
    selectedId = summaryCard.id;
  } else {
    selectedId = selectedCard.id;
  }

  // Unauthorized selection fallback.
  if (
    selectedCard.kind !== "summary" &&
    selectedId !== "summary" &&
    !canViewUserId(hierarchy, selectedId) &&
    !isCallerOnly
  ) {
    selectedCard = summaryCard;
    selectedId = "summary";
  }

  const detailMemberIds = selectedCard.memberUserIds;
  const detailRows = rowsForMembers(rowByUserId, detailMemberIds);
  const periodCounts = await loadPeriodCallCounts(
    organizationId,
    detailMemberIds.length > 0 ? detailMemberIds : undefined,
    now,
  );

  const stageDistribution = mergeNamedCounts(detailRows, (row) => row.stageMetrics);
  const lossReasons = mergeNamedCounts(detailRows, (row) => row.lossReasonMetrics);
  const callOutcomes = mergeNamedCounts(detailRows, (row) => row.outcomeMetrics);

  // Campaign contribution + conversion trend from scoped leads (single query).
  const detailLeads =
    detailMemberIds.length > 0
      ? await listLeads(organizationId, {
          assignedToUserIds: detailMemberIds,
          campaignId: safeQuery.campaignId,
          limit: 100_000,
        })
      : [];

  const campaignCount = new Map<string, NamedCount>();
  const trendCount = new Map<string, NamedCount>();
  const funnelBuckets = new Map<string, NamedCount>([
    ["INITIAL", { key: "INITIAL", label: "Initial", count: 0 }],
    ["ACTIVE", { key: "ACTIVE", label: "Active", count: 0 }],
    ["CLOSED", { key: "CLOSED", label: "Closed", count: 0 }],
  ]);

  for (const lead of detailLeads) {
    const bucket = funnelBuckets.get(lead.currentStageBucket);
    if (bucket) bucket.count += 1;

    if (lead.campaignId) {
      const campaign = campaigns.find((item) => item.id === lead.campaignId);
      const label = campaign?.name ?? "Campaign";
      const existing = campaignCount.get(lead.campaignId);
      if (existing) existing.count += 1;
      else campaignCount.set(lead.campaignId, { key: lead.campaignId, label, count: 1 });
    }

    if (lead.wonAt) {
      const day = lead.wonAt.slice(0, 10);
      const existing = trendCount.get(day);
      if (existing) existing.count += 1;
      else trendCount.set(day, { key: day, label: day, count: 1 });
    }
  }

  const recentCalls =
    detailMemberIds.length > 0
      ? await listCallAttempts(organizationId, {
          agentUserIds: detailMemberIds.length === 1 ? undefined : detailMemberIds,
          agentUserId: detailMemberIds.length === 1 ? detailMemberIds[0] : undefined,
          initiatedFrom: new Date(leaderboard.dateFrom),
          initiatedTo: new Date(leaderboard.dateTo),
          limit: 20,
        })
      : [];

  const selectedUser =
    selectedCard.kind === "caller" ? userById.get(selectedCard.id) : null;
  const managerName =
    selectedUser?.reportingManagerName ??
    (selectedCard.kind === "team_lead"
      ? (userById.get(selectedCard.id)?.reportingManagerName ?? null)
      : null);
  const teamLeadName = selectedUser?.assignedTeamLeadName ?? null;
  const campaignNames = [
    ...new Set(detailRows.flatMap((row) => row.campaignNames)),
  ].sort((a, b) => a.localeCompare(b));

  const detail: LeaderboardDetailDto = {
    entity: selectedCard,
    email: selectedUser?.email ?? null,
    status: selectedUser?.status ?? null,
    managerName,
    teamLeadName,
    campaignNames,
    summary: buildSummaryStats(detailRows, periodCounts),
    stageDistribution,
    lossReasons,
    callOutcomes,
    campaignContribution: [...campaignCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    conversionTrend: [...trendCount.values()].sort((a, b) =>
      a.key.localeCompare(b.key),
    ),
    leadFunnel: buildFunnel(stageDistribution, [...funnelBuckets.values()]),
    recentActivity: recentCalls.slice(0, 12).map((call) => ({
      id: call.id,
      label: call.direction === "INBOUND" ? "Incoming call" : "Outgoing call",
      detail: `${call.status}${call.callOutcomeName ? ` · ${call.callOutcomeName}` : ""}`,
      occurredAt: call.initiatedAt,
    })),
  };

  return {
    viewerRole,
    isCallerOnly,
    dateFrom: leaderboard.dateFrom,
    dateTo: leaderboard.dateTo,
    preset: leaderboard.preset,
    sortBy: leaderboard.sortBy,
    drillId,
    drillLabel: drillUser?.fullName ?? null,
    selectedId,
    cards,
    detail,
    filterOptions: {
      campaigns: campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name })),
      teamLeads: (viewerRole === "Admin" || viewerRole === "Manager"
        ? teamLeads
        : []
      ).map((user) => ({ id: user.id, name: user.fullName })),
    },
  };
}
