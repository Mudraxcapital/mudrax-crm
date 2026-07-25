import { describe, expect, it } from "vitest";
import {
  addCampaignMemberSchema,
  assignCampaignLeadsSchema,
  changeCampaignStatusSchema,
  createCampaignSchema,
  updateCampaignSchema,
} from "../application/validators/campaignSchemas";

const VALID_UUID = "00000000-0000-0000-0000-000000000001";
const VALID_UUID_2 = "00000000-0000-0000-0000-000000000002";

describe("createCampaignSchema", () => {
  it("accepts a well-formed Campaign", () => {
    const result = createCampaignSchema.safeParse({ name: "Spring Push" });
    expect(result.success).toBe(true);
  });

  it("rejects a too-short name", () => {
    expect(createCampaignSchema.safeParse({ name: "A" }).success).toBe(false);
  });
});

describe("updateCampaignSchema", () => {
  it("accepts an empty patch", () => {
    expect(updateCampaignSchema.safeParse({}).success).toBe(true);
  });
});

describe("changeCampaignStatusSchema", () => {
  it("requires a known status", () => {
    expect(changeCampaignStatusSchema.safeParse({ status: "ACTIVE" }).success).toBe(true);
    expect(changeCampaignStatusSchema.safeParse({ status: "UNKNOWN" }).success).toBe(false);
  });
});

describe("addCampaignMemberSchema", () => {
  it("requires a valid userId", () => {
    expect(addCampaignMemberSchema.safeParse({ userId: "not-a-uuid" }).success).toBe(false);
    expect(addCampaignMemberSchema.safeParse({ userId: VALID_UUID }).success).toBe(true);
  });

  it("accepts an optional allocationWeight", () => {
    const result = addCampaignMemberSchema.safeParse({ userId: VALID_UUID, allocationWeight: 2.5 });
    expect(result.success).toBe(true);
  });
});

describe("assignCampaignLeadsSchema", () => {
  it("accepts EQUAL allocation with no percentages", () => {
    const result = assignCampaignLeadsSchema.safeParse({
      leadIds: [VALID_UUID],
      allocationMethod: "EQUAL",
    });
    expect(result.success).toBe(true);
  });

  it("accepts ROUND_ROBIN and RANDOM strategies", () => {
    expect(
      assignCampaignLeadsSchema.safeParse({
        leadIds: [VALID_UUID],
        allocationMethod: "ROUND_ROBIN",
      }).success,
    ).toBe(true);
    expect(
      assignCampaignLeadsSchema.safeParse({
        leadIds: [VALID_UUID],
        allocationMethod: "RANDOM",
      }).success,
    ).toBe(true);
  });

  it("requires at least one Lead", () => {
    expect(
      assignCampaignLeadsSchema.safeParse({ leadIds: [], allocationMethod: "EQUAL" }).success,
    ).toBe(false);
  });

  it("requires percentages for PERCENTAGE allocation", () => {
    const result = assignCampaignLeadsSchema.safeParse({
      leadIds: [VALID_UUID, VALID_UUID_2],
      allocationMethod: "PERCENTAGE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts PERCENTAGE allocation with percentages supplied", () => {
    const result = assignCampaignLeadsSchema.safeParse({
      leadIds: [VALID_UUID, VALID_UUID_2],
      allocationMethod: "PERCENTAGE",
      percentages: { [VALID_UUID]: 60, [VALID_UUID_2]: 40 },
    });
    expect(result.success).toBe(true);
  });

  it("requires an assignee for MANUAL allocation", () => {
    expect(
      assignCampaignLeadsSchema.safeParse({
        leadIds: [VALID_UUID],
        allocationMethod: "MANUAL",
      }).success,
    ).toBe(false);
    expect(
      assignCampaignLeadsSchema.safeParse({
        leadIds: [VALID_UUID],
        allocationMethod: "MANUAL",
        manualAssigneeUserId: VALID_UUID,
      }).success,
    ).toBe(true);
  });
});
