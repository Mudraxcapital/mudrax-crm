import { describe, expect, it } from "vitest";
import {
  completeFollowUpSchema,
  createFollowUpSchema,
  reassignFollowUpSchema,
  updateFollowUpSchema,
} from "../application/validators/followUpSchemas";

const VALID_UUID = "00000000-0000-0000-0000-000000000001";

describe("createFollowUpSchema", () => {
  it("accepts a well-formed Follow-up", () => {
    const result = createFollowUpSchema.safeParse({
      leadId: VALID_UUID,
      triggerType: "FOLLOW_UP",
      scheduledFor: "2030-01-01T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid triggerType", () => {
    const result = createFollowUpSchema.safeParse({
      leadId: VALID_UUID,
      triggerType: "SOMETHING_ELSE",
      scheduledFor: "2030-01-01T10:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing scheduledFor", () => {
    const result = createFollowUpSchema.safeParse({ leadId: VALID_UUID, triggerType: "FOLLOW_UP" });
    expect(result.success).toBe(false);
  });
});

describe("updateFollowUpSchema", () => {
  it("accepts an empty patch", () => {
    expect(updateFollowUpSchema.safeParse({}).success).toBe(true);
  });

  it("accepts rescheduling only", () => {
    const result = updateFollowUpSchema.safeParse({ scheduledFor: "2030-02-01T10:00:00.000Z" });
    expect(result.success).toBe(true);
  });
});

describe("completeFollowUpSchema", () => {
  it("accepts an empty completion (no outcome notes)", () => {
    expect(completeFollowUpSchema.safeParse({}).success).toBe(true);
  });

  it("accepts outcome notes", () => {
    expect(completeFollowUpSchema.safeParse({ outcomeNotes: "Customer confirmed." }).success).toBe(
      true,
    );
  });
});

describe("reassignFollowUpSchema", () => {
  it("requires a valid toUserId", () => {
    expect(reassignFollowUpSchema.safeParse({ toUserId: "not-a-uuid" }).success).toBe(false);
    expect(reassignFollowUpSchema.safeParse({ toUserId: VALID_UUID }).success).toBe(true);
  });
});
