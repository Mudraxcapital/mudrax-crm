import { describe, expect, it } from "vitest";
import { isFollowUpStageName } from "../application/lib/followUpStagePolicy";

describe("isFollowUpStageName", () => {
  it("matches common Follow Up stage labels", () => {
    expect(isFollowUpStageName("Follow Up")).toBe(true);
    expect(isFollowUpStageName("follow-up")).toBe(true);
    expect(isFollowUpStageName("Follow Ups")).toBe(true);
    expect(isFollowUpStageName("FOLLOW_UP")).toBe(true);
  });

  it("rejects unrelated stages", () => {
    expect(isFollowUpStageName("Fresh")).toBe(false);
    expect(isFollowUpStageName("Ringing")).toBe(false);
    expect(isFollowUpStageName("Do Not Disturb")).toBe(false);
  });
});
