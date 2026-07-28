// ============================================================================
// src/app/crm/_lib/loadCrmDashboard.ts
//
// CRM Dashboard data loader. Hierarchy/RBAC filters are applied by the caller
// first; an optional campaignId narrows the same queries without duplicating
// aggregation logic.
// ============================================================================

import { countCustomers } from "@/modules/customers";
import {
  countLeadCustomers,
  countLeads,
  getLeadsBySource,
  getLeadsByStage,
  type LeadsBySourceEntry,
  type LeadsByStageEntry,
  type ListLeadsFilter,
} from "@/modules/leads";
import { CAMPAIGN_STATUSES, listCampaigns, type CampaignDto } from "@/modules/campaigns";

export interface CrmDashboardBookFilter {
  ownerManagerId?: string;
}

export interface LoadCrmDashboardInput {
  organizationId: string;
  /** Manager-book filter for customers/campaigns (already hierarchy-scoped). */
  book: CrmDashboardBookFilter;
  /** Hierarchy filter for lead aggregates (already hierarchy-scoped). */
  leadFilter: ListLeadsFilter;
  /** Team Lead customer visibility via leads (when set, replaces manager-book customer count). */
  customerLeadFilter?: ListLeadsFilter | null;
  /** Optional campaign scope from ?campaignId= — must already be authorized. */
  campaignId?: string | null;
  canViewCustomers: boolean;
  canViewLeads: boolean;
  canViewCampaigns: boolean;
}

export interface CrmDashboardCampaignStatusEntry {
  status: (typeof CAMPAIGN_STATUSES)[number];
  count: number;
}

export interface CrmDashboardData {
  /** Full authorized campaign list (for the filter dropdown). */
  campaigns: CampaignDto[];
  /** Campaigns reflected in Campaign Count / Active / Summary widgets. */
  visibleCampaigns: CampaignDto[];
  selectedCampaignId: string | null;
  totalCustomers: number;
  totalLeads: number;
  leadsByStage: LeadsByStageEntry[];
  leadsBySource: LeadsBySourceEntry[];
  campaignsByStatus: CrmDashboardCampaignStatusEntry[];
}

export async function loadCrmDashboard(
  input: LoadCrmDashboardInput,
): Promise<CrmDashboardData> {
  const {
    organizationId,
    book,
    leadFilter,
    customerLeadFilter,
    campaignId,
    canViewCustomers,
    canViewLeads,
    canViewCampaigns,
  } = input;

  const campaigns = canViewCampaigns
    ? await listCampaigns(organizationId, book)
    : [];

  const selectedCampaignId =
    campaignId && campaigns.some((campaign) => campaign.id === campaignId)
      ? campaignId
      : null;

  // Hierarchy first, then optional campaign — same filter object for all lead KPIs.
  const scopedLeadFilter: ListLeadsFilter = {
    ...leadFilter,
    ...(selectedCampaignId ? { campaignId: selectedCampaignId } : {}),
  };

  const visibleCampaigns = selectedCampaignId
    ? campaigns.filter((campaign) => campaign.id === selectedCampaignId)
    : campaigns;

  const [totalCustomers, totalLeads, leadsByStage, leadsBySource] = await Promise.all([
    canViewCustomers
      ? selectedCampaignId && canViewLeads
        ? countLeadCustomers(organizationId, scopedLeadFilter)
        : customerLeadFilter
          ? countLeadCustomers(organizationId, customerLeadFilter)
          : countCustomers(organizationId, book)
      : Promise.resolve(0),
    canViewLeads ? countLeads(organizationId, scopedLeadFilter) : Promise.resolve(0),
    canViewLeads
      ? getLeadsByStage(organizationId, scopedLeadFilter)
      : Promise.resolve([] as LeadsByStageEntry[]),
    canViewLeads
      ? getLeadsBySource(organizationId, scopedLeadFilter)
      : Promise.resolve([] as LeadsBySourceEntry[]),
  ]);

  const campaignsByStatus = CAMPAIGN_STATUSES.map((status) => ({
    status,
    count: visibleCampaigns.filter((campaign) => campaign.status === status).length,
  })).filter((entry) => entry.count > 0);

  return {
    campaigns,
    visibleCampaigns,
    selectedCampaignId,
    totalCustomers,
    totalLeads,
    leadsByStage,
    leadsBySource,
    campaignsByStatus,
  };
}
