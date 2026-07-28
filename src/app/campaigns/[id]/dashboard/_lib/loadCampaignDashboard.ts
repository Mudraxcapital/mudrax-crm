// ============================================================================
// Campaign Dashboard data loader — composes existing module public APIs.
// Lead stage/source totals use SQL GROUP BY; call/follow-up counts use
// repository count filters. Member performance uses per-member COUNTs
// (N = members), never a full lead scan.
// ============================================================================

import {
  listCampaignAuditLog,
  listCampaignMembers,
  type CampaignDto,
} from "@/modules/campaigns";
import {
  countLeads,
  getLead,
  getLeadsBySource,
  getLeadsByStage,
  listImportBatches,
  listLeadAuditLog,
  listLeadNotes,
  listLeads,
  type ListLeadsFilter,
} from "@/modules/leads";
import { listFollowUpsByLead } from "@/modules/follow-ups";
import {
  countCallAttempts,
  listCallAttempts,
  type CallStatus,
} from "@/modules/telephony";
import { getUserSummary, listUsers } from "@/modules/users";
import { canViewUserId, type AuthorizationContext } from "@/modules/rbac";
import {
  agentHierarchyFilter,
  leadHierarchyFilter,
} from "@/shared/auth/applyHierarchyListFilter";
import { nameFromMap } from "@/shared/ui/displayName";
import { humanizeAuditAction } from "@/shared/ui/humanizeAuditAction";
import type { CampaignDashboardAccessMode } from "./authorizeCampaignDashboard";
import {
  descriptionMeta,
  type CampaignProgressGranularity,
} from "./campaignDashboardRange";

async function fillMissingUserNames(
  map: Map<string, string>,
  userIds: Array<string | null | undefined>,
): Promise<void> {
  const missing = [...new Set(userIds.filter((id): id is string => Boolean(id)))].filter(
    (id) => !map.has(id),
  );
  if (missing.length === 0) return;
  await Promise.all(
    missing.map(async (id) => {
      const summary = await getUserSummary(id);
      if (summary?.fullName?.trim()) map.set(id, summary.fullName.trim());
    }),
  );
}

async function buildUserNameMap(userIds: string[]): Promise<Map<string, string>> {
  const users = await listUsers({ limit: 5_000 });
  const map = new Map(
    users
      .filter((user) => user.fullName?.trim())
      .map((user) => [user.id, user.fullName.trim()]),
  );
  await fillMissingUserNames(map, userIds);
  return map;
}

export interface NamedCount {
  key: string;
  label: string;
  count: number;
}

export interface AssigneePerformanceRow {
  userId: string;
  employeeName: string;
  assignedLeads: number;
  calls: number;
  connected: number;
  conversionRate: number;
  pending: number;
  completed: number;
  averageCallDurationSeconds: number | null;
  lastActivityAt: string | null;
}

export interface CampaignDashboardActivityItem {
  id: string;
  label: string;
  action: string;
  occurredAt: string;
}

export interface CampaignDashboardLeadRow {
  id: string;
  fullName: string;
  phone: string | null;
  stageName: string;
  lostReasonName: string | null;
  assigneeName: string;
  nextActionAt: string | null;
}

export interface CampaignDashboardLeadNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface CampaignDashboardLeadFollowUp {
  id: string;
  scheduledFor: string;
  status: string;
  triggerType: string;
}

export interface CampaignDashboardLeadTimelineItem {
  id: string;
  action: string;
  summary: string;
  at: string;
}

export interface CampaignDashboardLeadFieldValue {
  key: string;
  label: string;
  value: string;
}

export interface CampaignDashboardLeadDetail {
  id: string;
  customerId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  stageId: string;
  stageName: string;
  stageBucket: string;
  lostReasonName: string | null;
  sourceName: string;
  assigneeName: string;
  nextActionAt: string | null;
  /** Next lead in the current assignee list (for Next Lead navigation). */
  nextLeadId: string | null;
  /** When the next lead is on another page, the 1-based page to open. */
  nextLeadPage: number | null;
  fieldValues: CampaignDashboardLeadFieldValue[];
  notes: CampaignDashboardLeadNote[];
  followUps: CampaignDashboardLeadFollowUp[];
  timeline: CampaignDashboardLeadTimelineItem[];
  latestCallAttemptId: string | null;
  latestCallStatus: string | null;
}

export interface CampaignDashboardLeadPaging {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CampaignDashboardData {
  campaign: CampaignDto;
  mode: CampaignDashboardAccessMode;
  source: string;
  priority: string;
  ownerName: string;
  assignedUserNames: string[];
  progressPercent: number;
  /** Selected assignee user id (internal); UI always shows selectedAssigneeName. */
  selectedAssigneeId: string | null;
  selectedAssigneeName: string | null;
  selectedLeadId: string | null;
  assigneeLeads: CampaignDashboardLeadRow[];
  leadPaging: CampaignDashboardLeadPaging;
  selectedLead: CampaignDashboardLeadDetail | null;
  summary: {
    totalLeads: number;
    assigned: number;
    unassigned: number;
    remaining: number;
    completed: number;
    fresh: number;
    contacted: number;
    interested: number;
    documents: number;
    approved: number;
    disbursed: number;
    lost: number;
    followUpsDueToday: number;
    pendingFollowUps: number;
    callsToday: number;
    callsThisWeek: number;
    callsThisMonth: number;
    conversionRate: number;
  };
  leadStatusDistribution: NamedCount[];
  leadSourceDistribution: NamedCount[];
  callOutcomes: NamedCount[];
  callingReport: NamedCount[];
  lostReasonDistribution: NamedCount[];
  teamPerformance: NamedCount[];
  assigneePerformance: AssigneePerformanceRow[];
  progressSeries: NamedCount[];
  progressGranularity: CampaignProgressGranularity;
  recentActivity: CampaignDashboardActivityItem[];
  canExportLeads: boolean;
  canExportSummary: boolean;
  showTeamCharts: boolean;
}

const CONNECTED: CallStatus[] = [
  "ANSWERED",
  "ON_HOLD",
  "TRANSFERRING",
  "CONFERENCING",
  "COMPLETED",
];

/** Page size for the campaign dashboard lead list. */
export const CAMPAIGN_DASHBOARD_LEAD_PAGE_SIZE = 50;

function matchStage(name: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(name));
}

function sumStages(
  stages: Array<{ stageName: string; count: number }>,
  patterns: RegExp[],
): number {
  return stages
    .filter((stage) => matchStage(stage.stageName, patterns))
    .reduce((sum, stage) => sum + stage.count, 0);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function bucketKey(date: Date, granularity: CampaignProgressGranularity): string {
  const day = startOfDay(date);
  if (granularity === "daily") return day.toISOString().slice(0, 10);
  const weekday = day.getDay() || 7;
  const monday = new Date(day);
  monday.setDate(day.getDate() - (weekday - 1));
  return `W${monday.toISOString().slice(0, 10)}`;
}

function bucketLabel(key: string, granularity: CampaignProgressGranularity): string {
  if (granularity === "daily") return key;
  return key.replace(/^W/, "Week ");
}

function intersectIds(allowed: string[] | undefined, members: string[]): string[] {
  if (!allowed) return members;
  const set = new Set(allowed);
  return members.filter((id) => set.has(id));
}

async function sumStatusCounts(
  organizationId: string,
  agentFilter: { agentUserId?: string; agentUserIds?: string[] },
  statuses: CallStatus[],
  from: Date | null,
  to: Date,
): Promise<number> {
  const counts = await Promise.all(
    statuses.map((status) =>
      countCallAttempts(organizationId, {
        ...agentFilter,
        status,
        initiatedFrom: from ?? undefined,
        initiatedTo: to,
      }),
    ),
  );
  return counts.reduce((sum, n) => sum + n, 0);
}

export async function loadCampaignDashboard(input: {
  organizationId: string;
  authContext: AuthorizationContext;
  campaign: CampaignDto;
  mode: CampaignDashboardAccessMode;
  rangeFrom: Date | null;
  rangeTo: Date;
  progressGranularity: CampaignProgressGranularity;
  canExportLeads: boolean;
  canExportSummary: boolean;
  /** Internal user id from ?assignee= — never shown in UI. */
  requestedAssigneeId?: string | null;
  /** Internal lead id from ?leadId=. */
  requestedLeadId?: string | null;
  /** 1-based lead list page from ?leadPage=. */
  requestedLeadPage?: number | null;
}): Promise<CampaignDashboardData> {
  const {
    organizationId,
    authContext,
    campaign,
    mode,
    rangeFrom,
    rangeTo,
    progressGranularity,
    canExportLeads,
    canExportSummary,
    requestedAssigneeId = null,
    requestedLeadId = null,
    requestedLeadPage = null,
  } = input;

  const showTeamCharts = mode === "full";
  const actorId = authContext.userId;
  const now = new Date();
  const todayFrom = startOfDay(now);
  const todayTo = endOfDay(now);
  const weekFrom = (() => {
    const d = startOfDay(now);
    const weekday = d.getDay() || 7;
    d.setDate(d.getDate() - (weekday - 1));
    return d;
  })();
  const monthFrom = (() => {
    const d = startOfDay(now);
    d.setDate(1);
    return d;
  })();

  const members = await listCampaignMembers(campaign.id);
  const activeMembers = members.filter((member) => member.isActive);
  const memberIds = activeMembers.map((member) => member.userId);
  const userNameById = await buildUserNameMap([
    campaign.ownerManagerId,
    campaign.createdByUserId,
    actorId,
    ...memberIds,
    requestedAssigneeId ?? "",
  ]);

  // Resolve selected assignee — Callers are always self; managers pick a member by name in UI.
  let selectedAssigneeId: string | null = null;
  if (mode === "self") {
    selectedAssigneeId = actorId;
  } else if (
    requestedAssigneeId &&
    memberIds.includes(requestedAssigneeId) &&
    canViewUserId(authContext.hierarchy, requestedAssigneeId)
  ) {
    selectedAssigneeId = requestedAssigneeId;
  }

  const hierarchyLead = leadHierarchyFilter(authContext);
  const baseLeadFilter: ListLeadsFilter = selectedAssigneeId
    ? {
        campaignId: campaign.id,
        ...(mode === "full" ? hierarchyLead : {}),
        assignedToUserIds: [selectedAssigneeId],
      }
    : mode === "self"
      ? { campaignId: campaign.id, assignedToUserIds: [actorId] }
      : { campaignId: campaign.id, ...hierarchyLead };

  const [stages, sources, totalLeads, auditLog, batches] = await Promise.all([
    getLeadsByStage(organizationId, baseLeadFilter),
    getLeadsBySource(organizationId, baseLeadFilter),
    countLeads(organizationId, baseLeadFilter),
    listCampaignAuditLog(campaign.id),
    listImportBatches(organizationId, { campaignId: campaign.id, limit: 500 }),
  ]);

  const hierarchyAgents = agentHierarchyFilter(authContext);
  const scopedAgentIds =
    mode === "self"
      ? [actorId]
      : intersectIds(hierarchyAgents.agentUserIds, memberIds.length > 0 ? memberIds : [actorId]);

  const callAgentFilter = selectedAssigneeId
    ? { agentUserId: selectedAssigneeId }
    : mode === "self"
      ? { agentUserId: actorId }
      : { agentUserIds: scopedAgentIds.length > 0 ? scopedAgentIds : [actorId] };

  const performanceTargets =
    mode === "self"
      ? [actorId]
      : memberIds.filter((userId) => canViewUserId(authContext.hierarchy, userId));


  const perMemberAssigned =
    performanceTargets.length > 0
      ? await Promise.all(
          performanceTargets.map((userId) =>
            countLeads(organizationId, {
              campaignId: campaign.id,
              ...(mode === "full" ? hierarchyLead : {}),
              assignedToUserIds: [userId],
            }),
          ),
        )
      : [];

  const assigned = perMemberAssigned.reduce((sum, n) => sum + n, 0);
  const campaignTotalForBook =
    mode === "self"
      ? totalLeads
      : await countLeads(organizationId, {
          campaignId: campaign.id,
          ...hierarchyLead,
        });
  const unassignedCount = mode === "self" ? 0 : Math.max(0, campaignTotalForBook - assigned);

  const completed = stages
    .filter((stage) => stage.bucket === "CLOSED")
    .reduce((sum, stage) => sum + stage.count, 0);
  const remaining = Math.max(0, totalLeads - completed);
  const won = sumStages(stages, [/^won$/i, /disburs/i]);
  const conversionRate = totalLeads === 0 ? 0 : won / totalLeads;

  const [
    followUpsDueToday,
    pendingFollowUps,
    callsToday,
    callsThisWeek,
    callsThisMonth,
    connectedCalls,
    noAnswerCalls,
    busyCalls,
    failedCalls,
    abandonedCalls,
    recentCalls,
  ] = await Promise.all([
    countLeads(organizationId, {
      ...baseLeadFilter,
      hasNextAction: true,
      nextActionFrom: todayFrom,
      nextActionTo: todayTo,
    }),
    countLeads(organizationId, {
      ...baseLeadFilter,
      hasNextAction: true,
    }),
    countCallAttempts(organizationId, {
      ...callAgentFilter,
      initiatedFrom: todayFrom,
      initiatedTo: todayTo,
    }),
    countCallAttempts(organizationId, {
      ...callAgentFilter,
      initiatedFrom: weekFrom,
      initiatedTo: todayTo,
    }),
    countCallAttempts(organizationId, {
      ...callAgentFilter,
      initiatedFrom: monthFrom,
      initiatedTo: todayTo,
    }),
    sumStatusCounts(organizationId, callAgentFilter, CONNECTED, rangeFrom, rangeTo),
    countCallAttempts(organizationId, {
      ...callAgentFilter,
      status: "NO_ANSWER",
      initiatedFrom: rangeFrom ?? undefined,
      initiatedTo: rangeTo,
    }),
    countCallAttempts(organizationId, {
      ...callAgentFilter,
      status: "BUSY",
      initiatedFrom: rangeFrom ?? undefined,
      initiatedTo: rangeTo,
    }),
    countCallAttempts(organizationId, {
      ...callAgentFilter,
      status: "FAILED",
      initiatedFrom: rangeFrom ?? undefined,
      initiatedTo: rangeTo,
    }),
    countCallAttempts(organizationId, {
      ...callAgentFilter,
      status: "ABANDONED",
      initiatedFrom: rangeFrom ?? undefined,
      initiatedTo: rangeTo,
    }),
    listCallAttempts(organizationId, {
      ...callAgentFilter,
      initiatedFrom: rangeFrom ?? undefined,
      initiatedTo: rangeTo,
      limit: 2_000,
    }),
  ]);

  const callOutcomes: NamedCount[] = [
    { key: "connected", label: "Connected", count: connectedCalls },
    {
      key: "not_connected",
      label: "Not Connected",
      count: noAnswerCalls + failedCalls + abandonedCalls,
    },
    { key: "busy", label: "Busy", count: busyCalls },
    { key: "rejected", label: "Rejected", count: failedCalls },
    { key: "no_answer", label: "No Answer", count: noAnswerCalls },
  ].filter((entry) => entry.count > 0);

  const progressMap = new Map<string, number>();
  for (const batch of batches) {
    const at = batch.completedAt ?? batch.committedAt ?? batch.createdAt;
    if (!at) continue;
    const when = new Date(at);
    if (rangeFrom && when < rangeFrom) continue;
    if (when > rangeTo) continue;
    const key = bucketKey(when, progressGranularity);
    progressMap.set(key, (progressMap.get(key) ?? 0) + (batch.createdRowCount ?? 0));
  }
  if (progressMap.size === 0) {
    for (const entry of auditLog) {
      const when = new Date(entry.occurredAt);
      if (rangeFrom && when < rangeFrom) continue;
      if (when > rangeTo) continue;
      const key = bucketKey(when, progressGranularity);
      progressMap.set(key, (progressMap.get(key) ?? 0) + 1);
    }
  }
  const progressSeries = [...progressMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({
      key,
      label: bucketLabel(key, progressGranularity),
      count,
    }));

  const callsByAgent = new Map<string, typeof recentCalls>();
  for (const call of recentCalls) {
    if (!call.agentUserId) continue;
    const list = callsByAgent.get(call.agentUserId) ?? [];
    list.push(call);
    callsByAgent.set(call.agentUserId, list);
  }

  await fillMissingUserNames(userNameById, [
    ...performanceTargets,
    ...auditLog.map((entry) => entry.actorId),
    ...recentCalls.map((call) => call.agentUserId),
  ]);

  const assigneePerformance: AssigneePerformanceRow[] = await Promise.all(
    performanceTargets.map(async (userId, index) => {
      const leadScope: ListLeadsFilter = {
        campaignId: campaign.id,
        assignedToUserIds: [userId],
        ...(mode === "full" ? hierarchyLead : {}),
      };
      const stageBreakdown = await getLeadsByStage(organizationId, leadScope);
      const assignedCount = perMemberAssigned[index] ?? 0;
      const pending = stageBreakdown
        .filter((stage) => stage.bucket !== "CLOSED")
        .reduce((sum, stage) => sum + stage.count, 0);
      const completedCount = stageBreakdown
        .filter((stage) => stage.bucket === "CLOSED")
        .reduce((sum, stage) => sum + stage.count, 0);
      const wonCount = sumStages(stageBreakdown, [/^won$/i, /disburs/i]);
      const agentCalls = callsByAgent.get(userId) ?? [];
      const connected = agentCalls.filter((call) =>
        CONNECTED.includes(call.status as CallStatus),
      ).length;
      const durations = agentCalls
        .map((call) => call.durationSeconds)
        .filter((value): value is number => typeof value === "number" && value > 0);
      const averageCallDurationSeconds =
        durations.length === 0
          ? null
          : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

      return {
        userId,
        employeeName: nameFromMap(userNameById, userId),
        assignedLeads: assignedCount,
        calls: agentCalls.length,
        connected,
        conversionRate: assignedCount === 0 ? 0 : wonCount / assignedCount,
        pending,
        completed: completedCount,
        averageCallDurationSeconds,
        lastActivityAt: agentCalls[0]?.createdAt ?? null,
      };
    }),
  );

  assigneePerformance.sort((a, b) => b.assignedLeads - a.assignedLeads);

  const teamPerformance: NamedCount[] = showTeamCharts
    ? assigneePerformance.slice(0, 12).map((row) => ({
        key: row.userId,
        label: row.employeeName,
        count: row.assignedLeads,
      }))
    : [];

  const { source, priority } = descriptionMeta(campaign.description);
  const progressPercent =
    totalLeads === 0 ? 0 : Math.round((completed / totalLeads) * 100);

  const recentActivity: CampaignDashboardActivityItem[] = [
    ...auditLog.slice(0, 40).map((entry) => {
      const actorName = entry.actorId ? nameFromMap(userNameById, entry.actorId) : null;
      const base = entry.action.replace(/([a-z])([A-Z])/g, "$1 $2");
      return {
        id: entry.id,
        action: entry.action,
        label: actorName && actorName !== "Unknown" ? `${base} · ${actorName}` : base,
        occurredAt:
          typeof entry.occurredAt === "string"
            ? entry.occurredAt
            : entry.occurredAt.toISOString(),
      };
    }),
    ...recentCalls.slice(0, 15).map((call) => {
      const agentName = call.agentUserId
        ? nameFromMap(userNameById, call.agentUserId)
        : null;
      const statusLabel = `Call ${call.status}${call.durationSeconds != null ? ` · ${call.durationSeconds}s` : ""}`;
      return {
        id: `call-${call.id}`,
        action: "CallCompleted",
        label:
          agentName && agentName !== "Unknown"
            ? `${statusLabel} · ${agentName}`
            : statusLabel,
        occurredAt: call.createdAt,
      };
    }),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 50);

  const callingReport: NamedCount[] = [
    { key: "connected", label: "connected", count: connectedCalls },
    {
      key: "attempted",
      label: "attempted",
      count: noAnswerCalls + busyCalls + failedCalls,
    },
    { key: "pending", label: "pending", count: Math.max(0, remaining) },
    { key: "skipped", label: "skipped", count: abandonedCalls },
  ];

  // Lead list: always load, 50 per page. Callers (mode=self) are scoped to
  // themselves via baseLeadFilter. Managers see all campaign assignees' leads,
  // or one person when ?assignee= is set.
  const leadListScope: ListLeadsFilter =
    selectedAssigneeId || mode === "self"
      ? { ...baseLeadFilter }
      : {
          campaignId: campaign.id,
          ...hierarchyLead,
          ...(memberIds.length > 0 ? { assignedToUserIds: memberIds } : {}),
        };

  const listTotal = await countLeads(organizationId, leadListScope);
  const pageSize = CAMPAIGN_DASHBOARD_LEAD_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize) || 1);
  const leadPage = Math.min(
    Math.max(1, requestedLeadPage && Number.isFinite(requestedLeadPage) ? requestedLeadPage : 1),
    totalPages,
  );
  const leadOffset = (leadPage - 1) * pageSize;

  const leads = await listLeads(organizationId, {
    ...leadListScope,
    limit: pageSize,
    offset: leadOffset,
  });
  await fillMissingUserNames(
    userNameById,
    leads.map((lead) => lead.currentAssigneeUserId),
  );

  const assigneeLeads: CampaignDashboardLeadRow[] = leads.map((lead) => ({
    id: lead.id,
    fullName: lead.fullNameSnapshot,
    phone: lead.phoneSnapshot,
    stageName: lead.currentStageName,
    lostReasonName: lead.lostReasonName,
    assigneeName: nameFromMap(userNameById, lead.currentAssigneeUserId),
    nextActionAt: lead.nextActionAt,
  }));

  const leadPaging: CampaignDashboardLeadPaging = {
    page: leadPage,
    pageSize,
    total: listTotal,
    hasNext: leadOffset + leads.length < listTotal,
    hasPrev: leadPage > 1,
  };

  // Lost-reason chart: sample from the same scope (cap) so pagination does not
  // empty the report when browsing page 2+.
  const lostReasonSample = await listLeads(organizationId, {
    ...leadListScope,
    limit: 500,
  });
  const lostCounts = new Map<string, { label: string; count: number }>();
  for (const lead of lostReasonSample) {
    if (!lead.lostReasonName && !lead.lostAt) continue;
    const key = lead.lostReasonId ?? lead.lostReasonName ?? "unknown";
    const label = lead.lostReasonName?.trim() || "Unknown Reason";
    const existing = lostCounts.get(key) ?? { label, count: 0 };
    existing.count += 1;
    lostCounts.set(key, existing);
  }
  const lostReasonDistribution: NamedCount[] = [...lostCounts.entries()]
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count);

  let selectedLead: CampaignDashboardLeadDetail | null = null;
  let selectedLeadId: string | null = null;

  if (requestedLeadId) {
    const onPage = leads.some((lead) => lead.id === requestedLeadId);
    try {
      const leadDetail = await getLead(requestedLeadId);
      const inCampaign = leadDetail.campaignId === campaign.id;
      const selfOk =
        mode !== "self" || leadDetail.currentAssigneeUserId === actorId;
      const assigneeOk =
        !selectedAssigneeId ||
        leadDetail.currentAssigneeUserId === selectedAssigneeId;
      const memberOk =
        selectedAssigneeId != null ||
        mode === "self" ||
        memberIds.length === 0 ||
        (leadDetail.currentAssigneeUserId != null &&
          memberIds.includes(leadDetail.currentAssigneeUserId));

      if (inCampaign && selfOk && assigneeOk && memberOk) {
        selectedLeadId = requestedLeadId;
        await fillMissingUserNames(userNameById, [leadDetail.currentAssigneeUserId]);

        let nextLeadId: string | null = null;
        let nextLeadPage: number | null = null;
        if (onPage) {
          const index = leads.findIndex((lead) => lead.id === requestedLeadId);
          if (index >= 0 && index < leads.length - 1) {
            nextLeadId = leads[index + 1]?.id ?? null;
          } else if (leadPaging.hasNext) {
            const peek = await listLeads(organizationId, {
              ...leadListScope,
              limit: 1,
              offset: leadOffset + leads.length,
            });
            nextLeadId = peek[0]?.id ?? null;
            nextLeadPage = nextLeadId ? leadPage + 1 : null;
          }
        }

        const [notes, auditLogForLead, followUps, callAttempts] = await Promise.all([
          listLeadNotes(leadDetail.id).catch(() => []),
          listLeadAuditLog(leadDetail.id).catch(() => []),
          listFollowUpsByLead(leadDetail.id).catch(() => []),
          listCallAttempts(organizationId, {
            leadId: leadDetail.id,
            limit: 5,
          }).catch(() => []),
        ]);

        const latestCall = callAttempts[0] ?? null;
        const fieldValues: CampaignDashboardLeadFieldValue[] = [
          {
            key: "full_name",
            label: "Name",
            value: leadDetail.fullNameSnapshot,
          },
          {
            key: "phone",
            label: "Phone",
            value: leadDetail.phoneSnapshot ?? "",
          },
          {
            key: "email",
            label: "Email",
            value: leadDetail.emailSnapshot ?? "",
          },
          ...(leadDetail.fieldValues ?? []).map((value) => ({
            key: value.internalKey,
            label: value.internalKey.replace(/_/g, " "),
            value: value.displayValue ?? "",
          })),
        ].filter((row) => row.value.trim().length > 0);

        selectedLead = {
          id: leadDetail.id,
          customerId: leadDetail.customerId,
          fullName: leadDetail.fullNameSnapshot,
          phone: leadDetail.phoneSnapshot,
          email: leadDetail.emailSnapshot,
          stageId: leadDetail.currentStageId,
          stageName: leadDetail.currentStageName,
          stageBucket: leadDetail.currentStageBucket,
          lostReasonName: leadDetail.lostReasonName,
          sourceName: leadDetail.leadSourceName,
          assigneeName: nameFromMap(userNameById, leadDetail.currentAssigneeUserId),
          nextActionAt: leadDetail.nextActionAt,
          nextLeadId,
          nextLeadPage,
          fieldValues,
          notes: notes.slice(0, 20).map((note) => ({
            id: note.id,
            body: note.body,
            createdAt: note.createdAt,
          })),
          followUps: followUps.slice(0, 20).map((item) => ({
            id: item.id,
            scheduledFor: item.scheduledFor,
            status: item.status,
            triggerType: item.triggerType,
          })),
          timeline: [
            ...auditLogForLead.slice(0, 40).map((entry) => ({
              id: entry.id,
              action: entry.action,
              summary: humanizeAuditAction(entry.action),
              at:
                entry.occurredAt instanceof Date
                  ? entry.occurredAt.toISOString()
                  : String(entry.occurredAt),
            })),
            ...callAttempts.slice(0, 10).map((call) => ({
              id: `call-${call.id}`,
              action: "CallAttempt",
              summary: `Call ${call.status}${
                call.durationSeconds != null ? ` · ${call.durationSeconds}s` : ""
              }`,
              at: call.createdAt,
            })),
          ]
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 40),
          latestCallAttemptId: latestCall?.id ?? null,
          latestCallStatus: latestCall?.status ?? null,
        };
      }
    } catch {
      // Lead missing / inaccessible — leave selection empty.
    }
  }

  return {
    campaign,
    mode,
    source,
    priority,
    ownerName: nameFromMap(userNameById, campaign.ownerManagerId),
    assignedUserNames: activeMembers.map((member) =>
      nameFromMap(userNameById, member.userId),
    ),
    progressPercent,
    selectedAssigneeId,
    selectedAssigneeName: selectedAssigneeId
      ? nameFromMap(userNameById, selectedAssigneeId)
      : null,
    selectedLeadId,
    assigneeLeads,
    leadPaging,
    selectedLead,
    summary: {
      totalLeads,
      assigned: selectedAssigneeId ? totalLeads : assigned,
      unassigned: selectedAssigneeId ? 0 : unassignedCount,
      remaining,
      completed,
      fresh: sumStages(stages, [/^fresh$/i, /^new$/i]),
      contacted: sumStages(stages, [/^contacted$/i]),
      interested: sumStages(stages, [/^interested$/i]),
      documents: sumStages(stages, [/document/i]),
      approved: sumStages(stages, [/approv/i, /submitted to bank/i]),
      disbursed: sumStages(stages, [/disburs/i, /^won$/i]),
      lost: sumStages(stages, [/^lost$/i]),
      followUpsDueToday,
      pendingFollowUps,
      callsToday,
      callsThisWeek,
      callsThisMonth,
      conversionRate,
    },
    leadStatusDistribution: stages.map((stage) => ({
      key: stage.stageId,
      label: stage.stageName,
      count: stage.count,
    })),
    leadSourceDistribution: sources.map((entry) => ({
      key: entry.sourceId,
      label: entry.sourceName,
      count: entry.count,
    })),
    callOutcomes,
    callingReport,
    lostReasonDistribution,
    teamPerformance,
    assigneePerformance,
    progressSeries,
    progressGranularity,
    recentActivity,
    canExportLeads,
    canExportSummary,
    showTeamCharts,
  };
}
