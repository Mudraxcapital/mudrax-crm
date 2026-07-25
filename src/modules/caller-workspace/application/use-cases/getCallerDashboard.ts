// ============================================================================
// src/modules/caller-workspace/application/use-cases/getCallerDashboard.ts
//
// Caller Dashboard — always scoped to the logged-in Caller + optional campaign.
// ============================================================================

import { listCampaignsForMember, getCampaign } from "@/modules/campaigns";
import { listLeads } from "@/modules/leads";
import { listFollowUps } from "@/modules/follow-ups";
import { listCallAttempts } from "@/modules/telephony";
import type { CallerDashboardDto, CallerLeadQueueItemDto } from "../dto/CallerWorkspaceDto";

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export interface GetCallerDashboardQuery {
  organizationId: string;
  callerUserId: string;
  loginAt: string;
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
    const myLeads = await listLeads(query.organizationId, {
      assignedToUserIds: [query.callerUserId],
      campaignId: selectedCampaignId ?? undefined,
      limit: 500,
    });

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

    const assignedToday = myLeads.filter((lead) => new Date(lead.createdAt) >= today).length;
    const completedCalls = myLeads.filter((lead) => lead.currentStageBucket === "CLOSED").length;

    const [followUps, recentCalls] = await Promise.all([
      listFollowUps(query.organizationId, {
        assignedToUserIds: [query.callerUserId],
        limit: 100,
      }).catch(() => []),
      listCallAttempts(query.organizationId, {
        agentUserId: query.callerUserId,
        initiatedFrom: today,
        limit: 50,
      }).catch(() => []),
    ]);

    const leadIds = new Set(myLeads.map((lead) => lead.id));
    const campaignCalls = selectedCampaignId
      ? recentCalls.filter((call) => !call.leadId || leadIds.has(call.leadId))
      : recentCalls;

    const todaysFollowUps = followUps.filter((item) => {
      if (selectedCampaignId) {
        const lead = myLeads.find((l) => l.id === item.leadId);
        if (!lead) return false;
      }
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
        pendingCalls: queue.length,
        completedCalls,
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
    };
  };
}
