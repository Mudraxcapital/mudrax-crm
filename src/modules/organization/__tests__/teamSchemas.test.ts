import { describe, expect, it } from "vitest";
import { createTeamSchema, updateTeamSchema } from "../application/validators/teamSchemas";

describe("createTeamSchema", () => {
  it("accepts valid input and defaults isArchived", () => {
    const result = createTeamSchema.safeParse({ name: "Mumbai Sales Team", code: "mum-sales" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("MUM-SALES");
      expect(result.data.isArchived).toBe(false);
      expect(result.data.branchId).toBeUndefined();
    }
  });

  it("accepts an optional branchId as a UUID", () => {
    const result = createTeamSchema.safeParse({
      name: "Mumbai Sales Team",
      code: "MUM-SALES",
      branchId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID branchId", () => {
    const result = createTeamSchema.safeParse({
      name: "Mumbai Sales Team",
      code: "MUM-SALES",
      branchId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a code with invalid characters", () => {
    const result = createTeamSchema.safeParse({ name: "Mumbai Sales Team", code: "mum sales!" });
    expect(result.success).toBe(false);
  });
});

describe("updateTeamSchema", () => {
  it("accepts a partial update", () => {
    const result = updateTeamSchema.safeParse({ isArchived: true });
    expect(result.success).toBe(true);
  });

  it("accepts clearing the branchId to null", () => {
    const result = updateTeamSchema.safeParse({ branchId: null });
    expect(result.success).toBe(true);
  });

  it("accepts an empty update (no-op)", () => {
    const result = updateTeamSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
