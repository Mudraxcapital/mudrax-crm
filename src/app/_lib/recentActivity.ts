// ============================================================================
// src/app/_lib/recentActivity.ts
//
// Composes the read-only Audit Trails already exposed by `leads`,
// `follow-ups`, and `campaigns` (each module's own `listRecentActivity`)
// into one chronological CRM Activity Timeline. This file intentionally
// lives outside `src/modules` — it is a presentation-layer composition
// over multiple modules' public APIs, not a new bounded context (no domain
// model, no repository, no writes, no audit log of its own).
//
// Next.js ignores route segments prefixed with `_`, so `_lib` is not routed.
// ============================================================================

import { listRecentLeadActivity, type LeadAuditRecord } from "@/modules/leads";
import { listRecentFollowUpActivity, type FollowUpAuditRecord } from "@/modules/follow-ups";
import { listRecentCampaignActivity, type CampaignAuditRecord } from "@/modules/campaigns";

export type ActivitySource = "Lead" | "FollowUp" | "Campaign";

export interface ActivityEntry {
  id: string;
  source: ActivitySource;
  action: string;
  label: string;
  targetType: string;
  targetId: string;
  /** The Lead a Lead/Follow-up event relates to, when derivable — used to link back to `/leads/[id]`. */
  leadId: string | null;
  occurredAt: Date;
}

function humanizeAction(action: string): string {
  return action.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function fromLeadRecord(record: LeadAuditRecord): ActivityEntry {
  const state = (record.afterState ?? record.beforeState) as Record<string, unknown> | null;
  const leadId =
    record.targetType === "Lead" ? record.targetId : ((state?.leadId as string) ?? null);
  return {
    id: record.id,
    source: "Lead",
    action: record.action,
    label: humanizeAction(record.action),
    targetType: record.targetType,
    targetId: record.targetId,
    leadId,
    occurredAt: record.occurredAt,
  };
}

function fromFollowUpRecord(record: FollowUpAuditRecord): ActivityEntry {
  const state = (record.afterState ?? record.beforeState) as Record<string, unknown> | null;
  return {
    id: record.id,
    source: "FollowUp",
    action: record.action,
    label: humanizeAction(record.action),
    targetType: record.targetType,
    targetId: record.targetId,
    leadId: (state?.leadId as string) ?? null,
    occurredAt: record.occurredAt,
  };
}

function fromCampaignRecord(record: CampaignAuditRecord): ActivityEntry {
  return {
    id: record.id,
    source: "Campaign",
    action: record.action,
    label: humanizeAction(record.action),
    targetType: record.targetType,
    targetId: record.targetId,
    leadId: null,
    occurredAt: record.occurredAt,
  };
}

export interface RecentActivitySources {
  includeLeads?: boolean;
  includeFollowUps?: boolean;
  includeCampaigns?: boolean;
}

export async function listRecentCrmActivity(
  organizationId: string,
  limit = 20,
  sources: RecentActivitySources = {},
): Promise<ActivityEntry[]> {
  const { includeLeads = true, includeFollowUps = true, includeCampaigns = true } = sources;

  const [leadActivity, followUpActivity, campaignActivity] = await Promise.all([
    includeLeads ? listRecentLeadActivity(organizationId, limit) : Promise.resolve([]),
    includeFollowUps ? listRecentFollowUpActivity(organizationId, limit) : Promise.resolve([]),
    includeCampaigns ? listRecentCampaignActivity(organizationId, limit) : Promise.resolve([]),
  ]);

  const merged = [
    ...leadActivity.map(fromLeadRecord),
    ...followUpActivity.map(fromFollowUpRecord),
    ...campaignActivity.map(fromCampaignRecord),
  ];

  merged.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return merged.slice(0, limit);
}
