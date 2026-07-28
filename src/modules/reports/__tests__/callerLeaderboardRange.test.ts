import { describe, expect, it } from "vitest";
import { resolveLeaderboardRange } from "../application/services/leaderboardRange";

describe("resolveLeaderboardRange", () => {
  const now = new Date("2026-07-25T15:00:00.000Z");

  it("resolves today", () => {
    const range = resolveLeaderboardRange("today", undefined, undefined, now);
    expect(range.from.getHours()).toBe(0);
    expect(range.to.getHours()).toBe(23);
    expect(range.from.getDate()).toBe(25);
  });

  it("resolves yesterday", () => {
    const range = resolveLeaderboardRange("yesterday", undefined, undefined, now);
    expect(range.from.getDate()).toBe(24);
    expect(range.to.getDate()).toBe(24);
  });

  it("resolves custom dates", () => {
    const range = resolveLeaderboardRange(
      "custom",
      "2026-07-01T00:00:00.000Z",
      "2026-07-10T23:59:59.000Z",
      now,
    );
    expect(range.from.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-07-10T23:59:59.000Z");
  });

  it("resolves this_year", () => {
    const range = resolveLeaderboardRange("this_year", undefined, undefined, now);
    expect(range.from.getFullYear()).toBe(2026);
    expect(range.from.getMonth()).toBe(0);
    expect(range.from.getDate()).toBe(1);
    expect(range.to.getDate()).toBe(25);
  });
});
