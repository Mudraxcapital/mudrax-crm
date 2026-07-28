// ============================================================================
// src/modules/caller-workspace/application/use-cases/listCallerCallHistory.ts
// ============================================================================

import { getCampaign, listCampaignsForMember } from "@/modules/campaigns";
import { listLeads } from "@/modules/leads";
import { listFollowUps } from "@/modules/follow-ups";
import { listCallAttempts } from "@/modules/telephony";
import type { CallerCallHistoryRowDto } from "../dto/CallerWorkspaceDto";

export interface ListCallerCallHistoryQuery {
  organizationId: string;
  callerUserId: string;
  campaignId?: string | null;
  limit?: number;
}

export function makeListCallerCallHistory() {
  return async function listCallerCallHistory(
    query: ListCallerCallHistoryQuery,
  ): Promise<CallerCallHistoryRowDto[]> {
    const memberships = await listCampaignsForMember(query.callerUserId);
    const campaignNameById = new Map(memberships.map((c) => [c.id, c.name]));

    const pageLimit = Math.min(query.limit ?? 200, 300);
    const [calls, leads, followUps] = await Promise.all([
      listCallAttempts(query.organizationId, {
        agentUserId: query.callerUserId,
        limit: pageLimit,
      }),
      listLeads(query.organizationId, {
        assignedToUserIds: [query.callerUserId],
        campaignId: query.campaignId ?? undefined,
        limit: 500,
      }),
      listFollowUps(query.organizationId, {
        assignedToUserIds: [query.callerUserId],
        limit: 300,
      }).catch(() => []),
    ]);

    const leadById = new Map(leads.map((lead) => [lead.id, lead]));
    const nextFollowUpByLead = new Map<string, string>();
    for (const item of followUps) {
      if (item.status === "COMPLETED" || item.status === "CANCELLED") continue;
      const existing = nextFollowUpByLead.get(item.leadId);
      if (!existing || item.scheduledFor < existing) {
        nextFollowUpByLead.set(item.leadId, item.scheduledFor);
      }
    }

    const rows: CallerCallHistoryRowDto[] = [];
    for (const call of calls) {
      if (query.campaignId) {
        if (!call.leadId) continue;
        const lead = leadById.get(call.leadId);
        if (!lead || lead.campaignId !== query.campaignId) continue;
      }

      const lead = call.leadId ? leadById.get(call.leadId) : undefined;
      let campaignName: string | null = null;
      if (lead?.campaignId) {
        campaignName = campaignNameById.get(lead.campaignId) ?? null;
        if (!campaignName) {
          try {
            campaignName = (await getCampaign(lead.campaignId)).name;
            campaignNameById.set(lead.campaignId, campaignName);
          } catch {
            campaignName = null;
          }
        }
      }

      rows.push({
        id: call.id,
        customerName: lead?.fullNameSnapshot ?? (call.leadId ? `Lead ${call.leadId.slice(0, 8)}…` : "—"),
        campaignName,
        status: call.status,
        callTime: call.initiatedAt,
        durationSeconds: call.durationSeconds,
        disposition: call.disposition,
        outcomeName: call.callOutcomeName,
        followUpAt: call.leadId ? (nextFollowUpByLead.get(call.leadId) ?? null) : null,
        leadId: call.leadId,
      });
    }

    return rows;
  };
}
