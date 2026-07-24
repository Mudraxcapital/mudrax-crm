import { describe, expect, it } from "vitest";
import {
  changeAgentSessionStatusSchema,
  createCallNoteSchema,
  createCallOutcomeSchema,
  createCallRecordingSchema,
  initiateClickToCallSchema,
  updateCallAttemptStatusSchema,
  updateCallOutcomeSchema,
} from "../application/validators/telephonySchemas";

const VALID_UUID = "00000000-0000-0000-0000-000000000001";
const VALID_UUID_2 = "00000000-0000-0000-0000-000000000002";

describe("initiateClickToCallSchema", () => {
  it("accepts a Call with only a leadId", () => {
    expect(initiateClickToCallSchema.safeParse({ leadId: VALID_UUID }).success).toBe(true);
  });

  it("accepts a Call with only a customerId", () => {
    expect(initiateClickToCallSchema.safeParse({ customerId: VALID_UUID }).success).toBe(true);
  });

  it("rejects a Call with neither leadId nor customerId", () => {
    expect(initiateClickToCallSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a malformed leadId", () => {
    expect(initiateClickToCallSchema.safeParse({ leadId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("updateCallAttemptStatusSchema", () => {
  it("requires a valid status", () => {
    expect(updateCallAttemptStatusSchema.safeParse({}).success).toBe(false);
    expect(updateCallAttemptStatusSchema.safeParse({ status: "NOT_A_STATUS" }).success).toBe(false);
    expect(updateCallAttemptStatusSchema.safeParse({ status: "RINGING" }).success).toBe(true);
  });

  it("accepts an optional Call Outcome and Disposition", () => {
    const result = updateCallAttemptStatusSchema.safeParse({
      status: "COMPLETED",
      disposition: "ANSWERED",
      callOutcomeId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe("createCallOutcomeSchema", () => {
  it("rejects an empty name", () => {
    expect(createCallOutcomeSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts a well-formed Call Outcome", () => {
    expect(createCallOutcomeSchema.safeParse({ name: "Interested", sortOrder: 1 }).success).toBe(
      true,
    );
  });
});

describe("updateCallOutcomeSchema", () => {
  it("accepts an empty patch", () => {
    expect(updateCallOutcomeSchema.safeParse({}).success).toBe(true);
  });

  it("accepts toggling isActive", () => {
    expect(updateCallOutcomeSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});

describe("createCallNoteSchema", () => {
  it("rejects an empty body", () => {
    expect(createCallNoteSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("accepts a non-empty body", () => {
    expect(createCallNoteSchema.safeParse({ body: "Left a voicemail." }).success).toBe(true);
  });
});

describe("changeAgentSessionStatusSchema", () => {
  it("accepts only the manual availability statuses", () => {
    expect(changeAgentSessionStatusSchema.safeParse({ status: "AVAILABLE" }).success).toBe(true);
    expect(changeAgentSessionStatusSchema.safeParse({ status: "BREAK" }).success).toBe(true);
    expect(changeAgentSessionStatusSchema.safeParse({ status: "LOGGED_OUT" }).success).toBe(false);
    expect(changeAgentSessionStatusSchema.safeParse({ status: "ON_CALL" }).success).toBe(false);
  });
});

describe("createCallRecordingSchema", () => {
  it("requires callAttemptId, storageReference, and startedAt", () => {
    expect(createCallRecordingSchema.safeParse({}).success).toBe(false);
    const result = createCallRecordingSchema.safeParse({
      callAttemptId: VALID_UUID,
      storageReference: "s3://recordings/a.wav",
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional durationSeconds and providerMetadata", () => {
    const result = createCallRecordingSchema.safeParse({
      callAttemptId: VALID_UUID_2,
      storageReference: "s3://recordings/b.wav",
      startedAt: new Date().toISOString(),
      durationSeconds: 90,
      providerMetadata: { codec: "opus" },
    });
    expect(result.success).toBe(true);
  });
});
