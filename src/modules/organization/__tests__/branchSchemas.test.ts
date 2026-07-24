import { describe, expect, it } from "vitest";
import { createBranchSchema, updateBranchSchema } from "../application/validators/branchSchemas";

describe("createBranchSchema", () => {
  it("accepts valid input and defaults timezone/isArchived", () => {
    const result = createBranchSchema.safeParse({ name: "Mumbai Head Office", code: "mum-ho" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("MUM-HO");
      expect(result.data.timezone).toBe("Asia/Kolkata");
      expect(result.data.isArchived).toBe(false);
    }
  });

  it("rejects a name that is too short", () => {
    const result = createBranchSchema.safeParse({ name: "M", code: "MUM-HO" });
    expect(result.success).toBe(false);
  });

  it("rejects a code with invalid characters", () => {
    const result = createBranchSchema.safeParse({
      name: "Mumbai Head Office",
      code: "mumbai ho!",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an optional address", () => {
    const result = createBranchSchema.safeParse({
      name: "Mumbai Head Office",
      code: "MUM-HO",
      address: "Bandra Kurla Complex, Mumbai",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateBranchSchema", () => {
  it("accepts a partial update", () => {
    const result = updateBranchSchema.safeParse({ isArchived: true });
    expect(result.success).toBe(true);
  });

  it("accepts an empty update (no-op)", () => {
    const result = updateBranchSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts clearing the address to null", () => {
    const result = updateBranchSchema.safeParse({ address: null });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid code even when other fields are omitted", () => {
    const result = updateBranchSchema.safeParse({ code: "!!" });
    expect(result.success).toBe(false);
  });
});
