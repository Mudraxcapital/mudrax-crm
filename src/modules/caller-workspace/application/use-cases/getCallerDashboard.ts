// ============================================================================
// src/modules/caller-workspace/application/use-cases/getCallerDashboard.ts
//
// Caller Dashboard — always scoped to the logged-in Caller + optional campaign.
// ============================================================================

import { listCampaignsForMember, getCampaign } from "@/modules/campaigns";
import { countLeads, listLeads } from "@/modules/leads";
import { listFollowUps } from "@/modules/follow-ups";
import { listCallAttempts } from "@/modules/telephony";
import { getDailyLoginDuration } from "@/modules/users";
import type { CallerDashboardDto, CallerLeadQueueItemDto } from "../dto/CallerWorkspaceDto";

const QUEUE_LIMIT = 100;
const FOLLOW_UP_LIMIT = 100;
const CALL_LIMIT = 100;

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export interface GetCallerDashboardQuery {
  organizationId: string;
  callerUserId: string;
  loginAt: string;
  currentSessionId?: string | null;
  campaignId?: string | null;
}

export function makeGetCallerDashboard() {
  return async function getCallerDashboard(
    query: GetCallerDashboardQuery,
  ): Promise<CallerDashboardDto> {
    const campaigns = await listCampaignsForMember(query.callerUserId);
    const selectedCampaignId =
      query.campaignId && campaigns.some((c) => c.id === query.campaignId)
        ? query.campaignId
        : (campaigns[0]?.id ?? null);

    const today = startOfToday();
    const leadScope = {
      assignedToUserIds: [query.callerUserId],
      campaignId: selectedCampaignId ?? undefined,
    };

    const [myLeads, assignedToday, followUps, recentCalls, dailyLogin] = await Promise.all([
      listLeads(query.organizationId, {
        ...leadScope,
        limit: QUEUE_LIMIT,
      }),
      // Assignment timestamp — not lead.createdAt.
      countLeads(query.organizationId, {
        ...leadScope,
        currentAssignedAtFrom: today,
      }),
      listFollowUps(query.organizationId, {
        assignedToUserIds: [query.callerUserId],
        limit: FOLLOW_UP_LIMIT,
      }).catch(() => []),
      listCallAttempts(query.organizationId, {
        agentUserId: query.callerUserId,
        initiatedFrom: today,
        limit: CALL_LIMIT,
      }).catch(() => []),
      getDailyLoginDuration({
        userId: query.callerUserId,
        currentSessionId: query.currentSessionId,
      }).catch(() => ({
        priorSecondsToday: 0,
        totalSecondsToday: 0,
        dayStartedAt: today.toISOString(),
      })),
    ]);

    const queue: CallerLeadQueueItemDto[] = myLeads
      .filter((lead) => lead.currentStageBucket !== "CLOSED")
      .map((lead) => ({
        id: lead.id,
        fullNameSnapshot: lead.fullNameSnapshot,
        phoneSnapshot: lead.phoneSnapshot,
        currentStageName: lead.currentStageName,
        currentStageBucket: lead.currentStageBucket,
        campaignId: lead.campaignId,
        nextActionAt: lead.nextActionAt,
        leadSourceName: lead.leadSourceName,
      }));
    // Pending = open leads in the loaded page (caller day queues stay small).
    const pendingCalls = queue.length;

    const leadIds = new Set(myLeads.map((lead) => lead.id));
    const campaignCalls = selectedCampaignId
      ? recentCalls.filter((call) => !call.leadId || leadIds.has(call.leadId))
      : recentCalls;

    const scopedFollowUps = followUps.filter((item) => {
      if (!selectedCampaignId) return true;
      return leadIds.has(item.leadId);
    });

    // Reporting definition: "Completed" = follow-ups completed (not closed leads).
    const completedFollowUps = scopedFollowUps.filter((item) => {
      if (item.status !== "COMPLETED" || !item.completedAt) return false;
      return new Date(item.completedAt) >= today;
    }).length;

    const todaysFollowUps = scopedFollowUps.filter((item) => {
      const scheduled = new Date(item.scheduledFor);
      return scheduled >= today && item.status !== "COMPLETED" && item.status !== "CANCELLED";
    });

    const leadNameById = new Map(myLeads.map((lead) => [lead.id, lead.fullNameSnapshot]));
    let campaignName: string | null = null;
    if (selectedCampaignId) {
      try {
        campaignName = (await getCampaign(selectedCampaignId)).name;
      } catch {
        campaignName = campaigns.find((c) => c.id === selectedCampaignId)?.name ?? null;
      }
    }

    return {
      campaigns: campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status })),
      selectedCampaignId,
      progress: {
        assignedToday,
        pendingCalls,
        completedCalls: completedFollowUps,
        followUpsToday: todaysFollowUps.length,
        callsToday: campaignCalls.length,
      },
      queue: queue.slice(0, 40),
      recentCalls: campaignCalls.slice(0, 10).map((call) => ({
        id: call.id,
        customerName: call.leadId
          ? (leadNameById.get(call.leadId) ?? `Lead ${call.leadId.slice(0, 8)}…`)
          : "—",
        campaignName,
        status: call.status,
        callTime: call.initiatedAt,
        durationSeconds: call.durationSeconds,
        disposition: call.disposition,
        outcomeName: call.callOutcomeName,
        followUpAt: null,
        leadId: call.leadId,
      })),
      followUps: todaysFollowUps.slice(0, 10).map((item) => ({
        id: item.id,
        leadId: item.leadId,
        leadName: leadNameById.get(item.leadId) ?? `Lead ${item.leadId.slice(0, 8)}…`,
        scheduledFor: item.scheduledFor,
        status: item.status,
        triggerType: item.triggerType,
      })),
      loginAt: query.loginAt,
      priorLoginSecondsToday: dailyLogin.priorSecondsToday,
      dayStartedAt: dailyLogin.dayStartedAt,
    };
  };
}
