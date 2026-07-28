// ============================================================================
// src/modules/activity-timeline/application/use-cases/listUnifiedTimeline.ts
//
// Read-only composition over module-owned Audit Trails (leads.prisma notes
// LeadAuditLog doubles as the backing read model for activity-timeline).
// No separate activity table — no DB redesign.
// ============================================================================

import {
  listLeadsByCustomer,
  listRecentLeadActivity,
  type LeadAuditRecord,
} from "@/modules/leads";
import { listRecentFollowUpActivity, type FollowUpAuditRecord } from "@/modules/follow-ups";
import { listRecentCampaignActivity, type CampaignAuditRecord } from "@/modules/campaigns";
import { listRecentTelephonyActivity } from "@/modules/telephony";
import { listCustomerAuditLog } from "@/modules/customers";
import { humanizeAuditAction as humanizeAction } from "@/shared/ui/humanizeAuditAction";

export type TimelineSource =
  | "Lead"
  | "FollowUp"
  | "Campaign"
  | "Call"
  | "Customer"
  | "Document"
  | "Notification"
  | "LoanApplication";

export interface TimelineEntry {
  id: string;
  source: TimelineSource;
  action: string;
  label: string;
  targetType: string;
  targetId: string;
  leadId: string | null;
  customerId: string | null;
  occurredAt: Date;
}

function fromLead(record: LeadAuditRecord): TimelineEntry {
  const state = (record.afterState ?? record.beforeState) as Record<string, unknown> | null;
  return {
    id: record.id,
    source: "Lead",
    action: record.action,
    label: humanizeAction(record.action),
    targetType: record.targetType,
    targetId: record.targetId,
    leadId: record.targetType === "Lead" ? record.targetId : ((state?.leadId as string) ?? null),
    customerId: (state?.customerId as string) ?? null,
    occurredAt: record.occurredAt,
  };
}

function fromFollowUp(record: FollowUpAuditRecord): TimelineEntry {
  const state = (record.afterState ?? record.beforeState) as Record<string, unknown> | null;
  return {
    id: record.id,
    source: "FollowUp",
    action: record.action,
    label: humanizeAction(record.action),
    targetType: record.targetType,
    targetId: record.targetId,
    leadId: (state?.leadId as string) ?? null,
    customerId: null,
    occurredAt: record.occurredAt,
  };
}

function fromCampaign(record: CampaignAuditRecord): TimelineEntry {
  return {
    id: record.id,
    source: "Campaign",
    action: record.action,
    label: humanizeAction(record.action),
    targetType: record.targetType,
    targetId: record.targetId,
    leadId: null,
    customerId: null,
    occurredAt: record.occurredAt,
  };
}

export interface TimelineSources {
  includeLeads?: boolean;
  includeFollowUps?: boolean;
  includeCampaigns?: boolean;
  includeCalls?: boolean;
}

export async function listUnifiedTimeline(
  organizationId: string,
  limit = 50,
  sources: TimelineSources = {},
): Promise<TimelineEntry[]> {
  const {
    includeLeads = true,
    includeFollowUps = true,
    includeCampaigns = true,
    includeCalls = true,
  } = sources;

  const [leads, followUps, campaigns, calls] = await Promise.all([
    includeLeads ? listRecentLeadActivity(organizationId, limit) : Promise.resolve([]),
    includeFollowUps ? listRecentFollowUpActivity(organizationId, limit) : Promise.resolve([]),
    includeCampaigns ? listRecentCampaignActivity(organizationId, limit) : Promise.resolve([]),
    includeCalls ? listRecentTelephonyActivity(organizationId, limit) : Promise.resolve([]),
  ]);

  const merged: TimelineEntry[] = [
    ...leads.map(fromLead),
    ...followUps.map(fromFollowUp),
    ...campaigns.map(fromCampaign),
    ...calls.map((record) => {
      const state = (record.afterState ?? record.beforeState) as Record<string, unknown> | null;
      return {
        id: record.id,
        source: "Call" as const,
        action: record.action,
        label: humanizeAction(record.action),
        targetType: record.targetType,
        targetId: record.targetId,
        leadId: (state?.leadId as string) ?? null,
        customerId: (state?.customerId as string) ?? null,
        occurredAt: record.occurredAt,
      };
    }),
  ];

  merged.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return merged.slice(0, limit);
}

export async function listCustomerTimeline(
  customerId: string,
  organizationId: string,
  limit = 50,
): Promise<TimelineEntry[]> {
  const [orgTimeline, customerAudit, customerLeads] = await Promise.all([
    listUnifiedTimeline(organizationId, Math.max(limit * 4, 100), {
      includeLeads: true,
      includeFollowUps: true,
      includeCampaigns: false,
      includeCalls: true,
    }),
    listCustomerAuditLog(customerId),
    listLeadsByCustomer(customerId),
  ]);

  const customerLeadIds = new Set(customerLeads.map((lead) => lead.id));

  const customerEntries: TimelineEntry[] = customerAudit.map((record) => ({
    id: record.id,
    source: "Customer",
    action: record.action,
    label: humanizeAction(record.action),
    targetType: record.targetType,
    targetId: record.targetId,
    leadId: null,
    customerId,
    occurredAt: record.occurredAt,
  }));

  // Include Follow-ups / Calls / Leads linked via customerId or any of the
  // customer's Lead identities (Follow-up audit rows only carry leadId).
  const related = orgTimeline.filter(
    (entry) =>
      entry.customerId === customerId ||
      (entry.leadId != null && customerLeadIds.has(entry.leadId)),
  );
  const merged = [...customerEntries, ...related];
  merged.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return merged.slice(0, limit);
}
