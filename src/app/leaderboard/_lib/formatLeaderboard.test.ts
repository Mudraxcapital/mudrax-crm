import { describe, expect, it } from "vitest";
import {
  formatLeaderboardDuration,
  formatLeaderboardNumber,
  formatLeaderboardPercent,
  initialsFromName,
} from "./formatLeaderboard";

describe("formatLeaderboard helpers", () => {
  it("formats compact call volumes", () => {
    expect(formatLeaderboardNumber(42)).toBe("42");
    expect(formatLeaderboardNumber(1_500)).toBe("1.5K");
    expect(formatLeaderboardNumber(366_000)).toBe("3.66L");
  });

  it("formats durations", () => {
    expect(formatLeaderboardDuration(65)).toBe("1m 5s");
    expect(formatLeaderboardDuration(3661)).toBe("1h 1m");
    expect(formatLeaderboardDuration(null)).toBe("—");
  });

  it("formats conversion rates", () => {
    expect(formatLeaderboardPercent(0.125)).toBe("12.5%");
  });

  it("builds initials", () => {
    expect(initialsFromName("Neha Sharma")).toBe("NS");
  });
});
