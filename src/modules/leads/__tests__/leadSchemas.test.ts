import { describe, expect, it } from "vitest";
import {
  assignLeadSchema,
  changeLeadStageSchema,
  createLeadNoteSchema,
  createLeadSchema,
  updateLeadSchema,
} from "../application/validators/leadSchemas";

const VALID_UUID = "00000000-0000-0000-0000-000000000001";
const VALID_UUID_2 = "00000000-0000-0000-0000-000000000002";

describe("createLeadSchema", () => {
  it("accepts a well-formed Lead", () => {
    const result = createLeadSchema.safeParse({
      customerId: VALID_UUID,
      leadSourceId: VALID_UUID_2,
      fullNameSnapshot: "Rahul Sharma",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing customerId", () => {
    const result = createLeadSchema.safeParse({
      leadSourceId: VALID_UUID_2,
      fullNameSnapshot: "Rahul Sharma",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed customerId", () => {
    const result = createLeadSchema.safeParse({
      customerId: "not-a-uuid",
      leadSourceId: VALID_UUID_2,
      fullNameSnapshot: "Rahul Sharma",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = createLeadSchema.safeParse({
      customerId: VALID_UUID,
      leadSourceId: VALID_UUID_2,
      fullNameSnapshot: "R",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = createLeadSchema.safeParse({
      customerId: VALID_UUID,
      leadSourceId: VALID_UUID_2,
      fullNameSnapshot: "Rahul Sharma",
      emailSnapshot: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateLeadSchema", () => {
  it("accepts an empty patch", () => {
    expect(updateLeadSchema.safeParse({}).success).toBe(true);
  });

  it("accepts nulling out phone/email", () => {
    const result = updateLeadSchema.safeParse({ phoneSnapshot: null, emailSnapshot: null });
    expect(result.success).toBe(true);
  });
});

describe("changeLeadStageSchema", () => {
  it("requires a stageId", () => {
    expect(changeLeadStageSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a stageId with an optional lostReasonId", () => {
    const result = changeLeadStageSchema.safeParse({
      stageId: VALID_UUID,
      lostReasonId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });
});

describe("assignLeadSchema", () => {
  it("requires a valid assignedToUserId", () => {
    expect(assignLeadSchema.safeParse({ assignedToUserId: "not-a-uuid" }).success).toBe(false);
    expect(assignLeadSchema.safeParse({ assignedToUserId: VALID_UUID }).success).toBe(true);
  });
});

describe("createLeadNoteSchema", () => {
  it("rejects an empty body", () => {
    expect(createLeadNoteSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("accepts a non-empty body", () => {
    expect(createLeadNoteSchema.safeParse({ body: "Called, left voicemail." }).success).toBe(true);
  });
});
