import { describe, expect, it } from "vitest";
import {
  descriptionMeta,
  resolveCampaignDashboardRange,
  resolveProgressGranularity,
  resolveRangeBounds,
} from "./campaignDashboardRange";

describe("campaignDashboardRange", () => {
  it("resolves known ranges and defaults to month", () => {
    expect(resolveCampaignDashboardRange("today")).toBe("today");
    expect(resolveCampaignDashboardRange("week")).toBe("week");
    expect(resolveCampaignDashboardRange("nope")).toBe("month");
    expect(resolveProgressGranularity("weekly")).toBe("weekly");
    expect(resolveProgressGranularity(undefined)).toBe("daily");
  });

  it("computes today bounds", () => {
    const now = new Date("2026-07-27T15:30:00");
    const { from, to } = resolveRangeBounds("today", { now });
    expect(from?.getHours()).toBe(0);
    expect(to.getHours()).toBe(23);
    expect(from?.getDate()).toBe(27);
  });

  it("parses priority and source from description", () => {
    expect(
      descriptionMeta("Source: Facebook\nPriority: HIGH\nNotes"),
    ).toEqual({ source: "Facebook", priority: "HIGH" });
  });
});
