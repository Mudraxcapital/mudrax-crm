import { describe, expect, it } from "vitest";
import type { LeadDto } from "@/modules/leads";
import {
  buildConversionFunnel,
  buildLeadTrend,
  buildSourceConversions,
  buildTopPerformingUsers,
  resolveTrendGranularity,
} from "../infrastructure/adapters/analyticsAggregates";

function lead(partial: Partial<LeadDto> & Pick<LeadDto, "id">): LeadDto {
  return {
    organizationId: "org",
    customerId: "cust",
    leadSourceId: "src1",
    leadSourceName: "Web",
    currentStageId: "st1",
    currentStageName: "Fresh",
    currentStageBucket: "INITIAL",
    lostReasonId: null,
    lostReasonName: null,
    campaignId: null,
    currentAssigneeUserId: null,
    permanentAssigneeUserId: null,
    temporaryAssigneeUntil: null,
    isTemporaryAssignee: false,
    ownerManagerId: null,
    ownerTeamLeadId: null,
    fullNameSnapshot: "Test",
    phoneSnapshot: null,
    emailSnapshot: null,
    nextActionAt: null,
    nextActionType: null,
    wonAt: null,
    lostAt: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...partial,
  };
}

describe("analyticsAggregates", () => {
  it("maps CRM stages into the conversion funnel", () => {
    const funnel = buildConversionFunnel([
      { key: "1", label: "Fresh (INITIAL)", count: 5 },
      { key: "2", label: "Contacted (ACTIVE)", count: 3 },
      { key: "3", label: "Interested (ACTIVE)", count: 2 },
      { key: "4", label: "Documentation In Progress (ACTIVE)", count: 1 },
      { key: "5", label: "Submitted to Bank (ACTIVE)", count: 1 },
      { key: "6", label: "Won (CLOSED)", count: 1 },
    ]);

    expect(funnel.find((s) => s.key === "fresh")?.count).toBe(5);
    expect(funnel.find((s) => s.key === "documents")?.count).toBe(1);
    expect(funnel.find((s) => s.key === "approved")?.count).toBe(1);
    expect(funnel.find((s) => s.key === "disbursed")?.count).toBe(1);
  });

  it("picks trend granularity from range length", () => {
    const now = new Date("2026-07-27T00:00:00.000Z");
    expect(
      resolveTrendGranularity(new Date("2026-07-20T00:00:00.000Z"), now),
    ).toBe("daily");
    expect(
      resolveTrendGranularity(new Date("2026-06-01T00:00:00.000Z"), now),
    ).toBe("weekly");
    expect(
      resolveTrendGranularity(new Date("2026-01-01T00:00:00.000Z"), now),
    ).toBe("monthly");
  });

  it("buckets lead trend and ranks users/sources", () => {
    const leads = [
      lead({
        id: "1",
        createdAt: "2026-07-01T10:00:00.000Z",
        currentAssigneeUserId: "u1",
        wonAt: "2026-07-02T10:00:00.000Z",
      }),
      lead({
        id: "2",
        createdAt: "2026-07-01T12:00:00.000Z",
        currentAssigneeUserId: "u1",
        leadSourceId: "src2",
        leadSourceName: "Ads",
        wonAt: "2026-07-03T10:00:00.000Z",
      }),
      lead({
        id: "3",
        createdAt: "2026-07-08T10:00:00.000Z",
        currentAssigneeUserId: "u2",
      }),
    ];

    const trend = buildLeadTrend(
      leads,
      new Date("2026-07-01T00:00:00.000Z"),
      new Date("2026-07-31T00:00:00.000Z"),
      "daily",
    );
    expect(trend.find((e) => e.key === "2026-07-01")?.count).toBe(2);

    const users = buildTopPerformingUsers(leads, new Map([["u1", "Alex"], ["u2", "Blake"]]));
    expect(users[0]).toMatchObject({ key: "u1", label: "Alex", count: 2 });

    const sources = buildSourceConversions(leads);
    expect(sources).toHaveLength(2);
    expect(sources[0]?.count).toBe(1);
  });
});
