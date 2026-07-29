import { describe, expect, it } from "vitest";
import { resolveDayBounds, minuteKey } from "../timezone";

describe("resolveDayBounds", () => {
  it("returns Asia/Kolkata calendar day bounds for a known UTC instant", () => {
    // 2026-03-15 18:30 UTC == 2026-03-16 00:00 IST
    const now = new Date("2026-03-15T18:30:00.000Z");
    const day = resolveDayBounds(now, "Asia/Kolkata");

    expect(day.dateKey).toBe("2026-03-16");
    expect(day.previousDateKey).toBe("2026-03-15");
    expect(day.dayStart.toISOString()).toBe("2026-03-15T18:30:00.000Z");
    expect(day.dayEnd.toISOString()).toBe("2026-03-16T18:30:00.000Z");
    expect(day.previousDayEnd.toISOString()).toBe(day.dayStart.toISOString());
  });

  it("formats a stable minute key in the organization timezone", () => {
    const now = new Date("2026-03-15T18:45:10.000Z");
    expect(minuteKey(now, "Asia/Kolkata")).toMatch(/^2026-03-16T00:15$/);
  });
});
