// ============================================================================
// src/modules/caller-workspace/application/use-cases/getCallerWorkspaceLead.ts
//
// Call Workspace aggregate for one assigned Lead. Enforces assignee = Caller.
// ============================================================================

import { getCampaign } from "@/modules/campaigns";
import {
  getLead,
  listLeadNotes,
  listLeadAuditLog,
  listLeads,
  LeadNotFoundError,
} from "@/modules/leads";
import { listFollowUpsByLead } from "@/modules/follow-ups";
import { listCallAttempts } from "@/modules/telephony";
import { humanizeAuditAction } from "@/shared/ui/humanizeAuditAction";
import type { CallerWorkspaceLeadDto } from "../dto/CallerWorkspaceDto";

export class CallerLeadAccessDeniedError extends Error {
  constructor(leadId: string) {
    super(`Lead ${leadId} is not assigned to the current Caller.`);
    this.name = "CallerLeadAccessDeniedError";
  }
}

export interface GetCallerWorkspaceLeadQuery {
  organizationId: string;
  callerUserId: string;
  leadId: string;
  campaignId?: string | null;
}

export function makeGetCallerWorkspaceLead() {
  return async function getCallerWorkspaceLead(
    query: GetCallerWorkspaceLeadQuery,
  ): Promise<CallerWorkspaceLeadDto> {
    let lead;
    try {
      lead = await getLead(query.leadId);
    } catch (error) {
      if (error instanceof LeadNotFoundError) throw error;
      throw error;
    }

    if (lead.organizationId !== query.organizationId) {
      throw new LeadNotFoundError(query.leadId);
    }
    if (lead.currentAssigneeUserId !== query.callerUserId) {
      throw new CallerLeadAccessDeniedError(query.leadId);
    }
    if (query.campaignId && lead.campaignId !== query.campaignId) {
      throw new CallerLeadAccessDeniedError(query.leadId);
    }

    const [notes, auditLog, followUps, siblings, callAttempts] = await Promise.all([
      listLeadNotes(query.leadId),
      listLeadAuditLog(query.leadId),
      listFollowUpsByLead(query.leadId),
      listLeads(query.organizationId, {
        assignedToUserIds: [query.callerUserId],
        campaignId: query.campaignId ?? lead.campaignId ?? undefined,
        limit: 200,
      }),
      listCallAttempts(query.organizationId, {
        leadId: query.leadId,
        agentUserId: query.callerUserId,
        limit: 5,
      }).catch(() => []),
    ]);

    const openQueue = siblings.filter((item) => item.currentStageBucket !== "CLOSED");
    const index = openQueue.findIndex((item) => item.id === lead.id);
    // Do not loop back to the first lead when the current/last lead is done.
    const resolvedNext =
      index >= 0 && index < openQueue.length - 1 ? openQueue[index + 1]!.id : null;

    let campaignName: string | null = null;
    if (lead.campaignId) {
      try {
        campaignName = (await getCampaign(lead.campaignId)).name;
      } catch {
        campaignName = null;
      }
    }

    const latestCall = callAttempts[0] ?? null;
    const fieldValues: Record<string, string | undefined> = {
      full_name: lead.fullNameSnapshot,
      phone: lead.phoneSnapshot ?? undefined,
      email: lead.emailSnapshot ?? undefined,
    };
    for (const value of lead.fieldValues ?? []) {
      fieldValues[value.internalKey] = value.displayValue;
    }

    return {
      id: lead.id,
      fullNameSnapshot: lead.fullNameSnapshot,
      phoneSnapshot: lead.phoneSnapshot,
      emailSnapshot: lead.emailSnapshot,
      currentStageId: lead.currentStageId,
      currentStageName: lead.currentStageName,
      currentStageBucket: lead.currentStageBucket,
      leadSourceName: lead.leadSourceName,
      campaignId: lead.campaignId,
      campaignName,
      customerId: lead.customerId,
      nextLeadId: resolvedNext,
      fieldValues,
      latestCallAttemptId: latestCall?.id ?? null,
      latestCallStatus: latestCall?.status ?? null,
      notes: notes.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: note.createdAt,
      })),
      followUps: followUps.map((item) => ({
        id: item.id,
        leadId: item.leadId,
        leadName: lead.fullNameSnapshot,
        scheduledFor: item.scheduledFor,
        status: item.status,
        triggerType: item.triggerType,
      })),
      timeline: auditLog.slice(0, 40).map((entry) => ({
        id: entry.id,
        action: entry.action,
        at:
          entry.occurredAt instanceof Date
            ? entry.occurredAt.toISOString()
            : String(entry.occurredAt),
        summary: humanizeAuditAction(entry.action),
      })),
    };
  };
}
