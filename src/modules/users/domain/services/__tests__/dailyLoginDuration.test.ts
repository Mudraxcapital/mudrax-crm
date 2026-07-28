import { describe, expect, it } from "vitest";
import {
  sessionEndAt,
  startOfLocalDay,
  sumLoginSecondsInWindow,
  type SessionInterval,
} from "../dailyLoginDuration";

function session(
  partial: Partial<SessionInterval> & { loginAt: Date },
): SessionInterval {
  return {
    id: partial.id,
    loginAt: partial.loginAt,
    logoutAt: partial.logoutAt ?? null,
    revokedAt: partial.revokedAt ?? null,
    status: partial.status ?? "ENDED",
  };
}

describe("sumLoginSecondsInWindow", () => {
  it("sums completed sessions inside the day and ignores other days", () => {
    const dayStart = startOfLocalDay(new Date("2026-07-27T12:00:00"));
    const dayEnd = new Date("2026-07-27T18:00:00");

    const sessions = [
      session({
        id: "a",
        loginAt: new Date("2026-07-27T09:00:00"),
        logoutAt: new Date("2026-07-27T10:00:00"),
      }),
      session({
        id: "b",
        loginAt: new Date("2026-07-26T09:00:00"),
        logoutAt: new Date("2026-07-26T11:00:00"),
      }),
    ];

    expect(sumLoginSecondsInWindow(sessions, dayStart, dayEnd)).toBe(3600);
  });

  it("keeps earlier sessions after logout by accumulating them", () => {
    const dayStart = startOfLocalDay(new Date("2026-07-27T12:00:00"));
    const now = new Date("2026-07-27T12:00:00");

    const sessions = [
      session({
        id: "morning",
        loginAt: new Date("2026-07-27T08:00:00"),
        logoutAt: new Date("2026-07-27T09:30:00"),
      }),
      session({
        id: "current",
        loginAt: new Date("2026-07-27T11:00:00"),
        status: "ACTIVE",
      }),
    ];

    const prior = sumLoginSecondsInWindow(sessions, dayStart, now, {
      excludeSessionId: "current",
    });
    expect(prior).toBe(90 * 60);

    const total = sumLoginSecondsInWindow(sessions, dayStart, now);
    expect(total).toBe(90 * 60 + 60 * 60);
  });

  it("clips overnight sessions to the current day window", () => {
    const dayStart = startOfLocalDay(new Date("2026-07-27T12:00:00"));
    const now = new Date("2026-07-27T01:00:00");

    const sessions = [
      session({
        id: "overnight",
        loginAt: new Date("2026-07-26T22:00:00"),
        status: "ACTIVE",
      }),
    ];

    expect(sumLoginSecondsInWindow(sessions, dayStart, now)).toBe(3600);
  });

  it("sessionEndAt uses now for active sessions", () => {
    const now = new Date("2026-07-27T12:00:00");
    expect(
      sessionEndAt(
        session({ loginAt: new Date("2026-07-27T10:00:00"), status: "ACTIVE" }),
        now,
      ),
    ).toEqual(now);
  });
});
