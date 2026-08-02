import { describe, expect, it } from "vitest";
import { callerWorkspaceRedirect, isCallerAllowedPath } from "../callerAccess";

describe("isCallerAllowedPath — telephony", () => {
  it("allows Caller Workspace telephony surfaces for own activity", () => {
    expect(isCallerAllowedPath("/telephony")).toBe(true);
    expect(isCallerAllowedPath("/telephony/calls")).toBe(true);
    expect(isCallerAllowedPath("/telephony/calls/abc")).toBe(true);
    expect(isCallerAllowedPath("/telephony/missed-calls")).toBe(true);
    expect(isCallerAllowedPath("/telephony/agent-sessions")).toBe(true);
    expect(isCallerAllowedPath("/api/telephony/calls")).toBe(true);
    expect(isCallerAllowedPath("/api/telephony/dashboard")).toBe(true);
    expect(isCallerAllowedPath("/api/telephony/missed-calls")).toBe(true);
    expect(isCallerAllowedPath("/api/telephony/agent-sessions")).toBe(true);
  });

  it("blocks Call Outcome catalog management for Callers", () => {
    expect(isCallerAllowedPath("/telephony/outcomes")).toBe(false);
    expect(isCallerAllowedPath("/api/telephony/outcomes")).toBe(false);
    expect(isCallerAllowedPath("/api/telephony/outcomes/abc")).toBe(false);
  });
});

describe("isCallerAllowedPath — campaigns & reports", () => {
  it("allows campaign dashboard (must not be blocked by /campaigns prefix)", () => {
    expect(isCallerAllowedPath("/campaigns/abc/dashboard")).toBe(true);
  });

  it("allows admin campaign/report URLs so layout can remap them", () => {
    expect(isCallerAllowedPath("/campaigns")).toBe(true);
    expect(isCallerAllowedPath("/campaigns/abc")).toBe(true);
    expect(isCallerAllowedPath("/reports")).toBe(true);
    expect(isCallerAllowedPath("/reports/caller-leaderboard")).toBe(true);
  });

  it("still blocks management APIs and CRM surfaces", () => {
    expect(isCallerAllowedPath("/api/campaigns")).toBe(false);
    expect(isCallerAllowedPath("/api/reports")).toBe(false);
    expect(isCallerAllowedPath("/api/loan-applications")).toBe(false);
    expect(isCallerAllowedPath("/api/loan-accounts")).toBe(false);
    expect(isCallerAllowedPath("/api/loan-products")).toBe(false);
    expect(isCallerAllowedPath("/crm")).toBe(false);
    expect(isCallerAllowedPath("/users")).toBe(false);
  });

  it("allows mobile Caller workspace APIs", () => {
    expect(isCallerAllowedPath("/api/caller/dashboard")).toBe(true);
    expect(isCallerAllowedPath("/api/caller/campaigns")).toBe(true);
    expect(isCallerAllowedPath("/api/caller/leads/abc")).toBe(true);
    expect(isCallerAllowedPath("/api/caller/catalog")).toBe(true);
    expect(isCallerAllowedPath("/api/caller/password")).toBe(true);
    expect(isCallerAllowedPath("/api/home/dashboard")).toBe(true);
    expect(isCallerAllowedPath("/api/auth/me")).toBe(true);
    expect(isCallerAllowedPath("/api/leaderboard")).toBe(true);
    expect(isCallerAllowedPath("/api/users/abc/photo")).toBe(true);
  });
});

describe("callerWorkspaceRedirect", () => {
  it("sends Campaigns list and Reports to Caller Workspace surfaces", () => {
    expect(callerWorkspaceRedirect("/campaigns")).toBe("/caller/campaigns");
    expect(callerWorkspaceRedirect("/reports")).toBe("/leaderboard");
    expect(callerWorkspaceRedirect("/reports/leads")).toBe("/leaderboard");
  });

  it("sends campaign detail/edit to the membership dashboard", () => {
    expect(callerWorkspaceRedirect("/campaigns/abc")).toBe("/campaigns/abc/dashboard");
    expect(callerWorkspaceRedirect("/campaigns/abc/edit")).toBe("/campaigns/abc/dashboard");
  });

  it("does not remap an already-safe dashboard path", () => {
    expect(callerWorkspaceRedirect("/campaigns/abc/dashboard")).toBeNull();
    expect(callerWorkspaceRedirect("/leaderboard")).toBeNull();
    expect(callerWorkspaceRedirect("/caller/campaigns")).toBeNull();
  });
});
