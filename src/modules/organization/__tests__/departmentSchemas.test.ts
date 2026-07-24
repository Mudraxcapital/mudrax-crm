import { describe, expect, it } from "vitest";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../application/validators/departmentSchemas";

describe("createDepartmentSchema", () => {
  it("accepts valid input and defaults isArchived", () => {
    const result = createDepartmentSchema.safeParse({ name: "Sales", code: "sales" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("SALES");
      expect(result.data.isArchived).toBe(false);
    }
  });

  it("rejects a name that is too short", () => {
    const result = createDepartmentSchema.safeParse({ name: "S", code: "SALES" });
    expect(result.success).toBe(false);
  });

  it("rejects a code with invalid characters", () => {
    const result = createDepartmentSchema.safeParse({ name: "Sales", code: "sales!" });
    expect(result.success).toBe(false);
  });
});

describe("updateDepartmentSchema", () => {
  it("accepts a partial update", () => {
    const result = updateDepartmentSchema.safeParse({ isArchived: true });
    expect(result.success).toBe(true);
  });

  it("accepts an empty update (no-op)", () => {
    const result = updateDepartmentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects an invalid code even when other fields are omitted", () => {
    const result = updateDepartmentSchema.safeParse({ code: "!!" });
    expect(result.success).toBe(false);
  });
});
