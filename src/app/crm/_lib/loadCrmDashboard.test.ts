import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/modules/customers", () => ({
  countCustomers: vi.fn(),
}));

vi.mock("@/modules/leads", () => ({
  countLeads: vi.fn(),
  countLeadCustomers: vi.fn(),
  getLeadsByStage: vi.fn(),
  getLeadsBySource: vi.fn(),
}));

vi.mock("@/modules/campaigns", () => ({
  CAMPAIGN_STATUSES: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"],
  listCampaigns: vi.fn(),
}));

import { countCustomers } from "@/modules/customers";
import { countLeadCustomers, countLeads, getLeadsBySource, getLeadsByStage } from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { loadCrmDashboard } from "./loadCrmDashboard";

const orgId = "00000000-0000-0000-0000-000000000001";
const campaignA = {
  id: "00000000-0000-0000-0000-0000000000aa",
  organizationId: orgId,
  name: "Campaign A",
  status: "ACTIVE" as const,
  ownerManagerId: "00000000-0000-0000-0000-0000000000m1",
  description: null,
  startDate: null,
  endDate: null,
  createdByUserId: "00000000-0000-0000-0000-0000000000u1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const campaignB = {
  ...campaignA,
  id: "00000000-0000-0000-0000-0000000000bb",
  name: "Campaign B",
  status: "DRAFT" as const,
};

describe("loadCrmDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCampaigns).mockResolvedValue([campaignA, campaignB]);
    vi.mocked(countCustomers).mockResolvedValue(100);
    vi.mocked(countLeadCustomers).mockResolvedValue(12);
    vi.mocked(countLeads).mockResolvedValue(40);
    vi.mocked(getLeadsByStage).mockResolvedValue([
      { stageId: "s1", stageName: "New", bucket: "INITIAL", count: 40 },
    ]);
    vi.mocked(getLeadsBySource).mockResolvedValue([
      { sourceId: "src1", sourceName: "Web", count: 40 },
    ]);
  });

  it("without campaignId keeps unfiltered customer count and all campaigns", async () => {
    const result = await loadCrmDashboard({
      organizationId: orgId,
      book: { ownerManagerId: "mgr-1" },
      leadFilter: { ownerManagerId: "mgr-1" },
      campaignId: null,
      canViewCustomers: true,
      canViewLeads: true,
      canViewCampaigns: true,
    });

    expect(countCustomers).toHaveBeenCalledWith(orgId, { ownerManagerId: "mgr-1" });
    expect(countLeadCustomers).not.toHaveBeenCalled();
    expect(countLeads).toHaveBeenCalledWith(orgId, { ownerManagerId: "mgr-1" });
    expect(getLeadsByStage).toHaveBeenCalledWith(orgId, { ownerManagerId: "mgr-1" });
    expect(result.selectedCampaignId).toBeNull();
    expect(result.visibleCampaigns).toHaveLength(2);
    expect(result.totalCustomers).toBe(100);
    expect(result.campaignsByStatus.find((e) => e.status === "ACTIVE")?.count).toBe(1);
  });

  it("with authorized campaignId scopes all lead KPIs and campaign widgets", async () => {
    const result = await loadCrmDashboard({
      organizationId: orgId,
      book: {},
      leadFilter: { ownerManagerId: "mgr-1" },
      campaignId: campaignA.id,
      canViewCustomers: true,
      canViewLeads: true,
      canViewCampaigns: true,
    });

    const scoped = { ownerManagerId: "mgr-1", campaignId: campaignA.id };
    expect(countLeadCustomers).toHaveBeenCalledWith(orgId, scoped);
    expect(countCustomers).not.toHaveBeenCalled();
    expect(countLeads).toHaveBeenCalledWith(orgId, scoped);
    expect(getLeadsByStage).toHaveBeenCalledWith(orgId, scoped);
    expect(getLeadsBySource).toHaveBeenCalledWith(orgId, scoped);
    expect(result.selectedCampaignId).toBe(campaignA.id);
    expect(result.visibleCampaigns).toEqual([campaignA]);
    expect(result.totalCustomers).toBe(12);
    expect(result.campaigns).toHaveLength(2);
    expect(result.campaignsByStatus).toEqual([{ status: "ACTIVE", count: 1 }]);
  });

  it("ignores campaignId outside the authorized campaign list", async () => {
    const result = await loadCrmDashboard({
      organizationId: orgId,
      book: {},
      leadFilter: {},
      campaignId: "00000000-0000-0000-0000-0000000000ff",
      canViewCustomers: true,
      canViewLeads: true,
      canViewCampaigns: true,
    });

    expect(result.selectedCampaignId).toBeNull();
    expect(countLeads).toHaveBeenCalledWith(orgId, {});
    expect(countCustomers).toHaveBeenCalled();
  });
});
