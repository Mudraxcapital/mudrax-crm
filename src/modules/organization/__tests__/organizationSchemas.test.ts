import { describe, expect, it } from "vitest";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from "../application/validators/organizationSchemas";

describe("createOrganizationSchema", () => {
  it("accepts valid input and defaults status/timezone", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Mudrax Capitals",
      code: "mudrax",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("MUDRAX");
      expect(result.data.status).toBe("ACTIVE");
      expect(result.data.timezone).toBe("Asia/Kolkata");
    }
  });

  it("rejects a name that is too short", () => {
    const result = createOrganizationSchema.safeParse({ name: "M", code: "MUDRAX" });
    expect(result.success).toBe(false);
  });

  it("rejects a code with invalid characters", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Mudrax Capitals",
      code: "mudrax capitals!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Mudrax Capitals",
      code: "MUDRAX",
      status: "DELETED",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateOrganizationSchema", () => {
  it("accepts a partial update", () => {
    const result = updateOrganizationSchema.safeParse({ status: "SUSPENDED" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty update (no-op)", () => {
    const result = updateOrganizationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects an invalid code even when other fields are omitted", () => {
    const result = updateOrganizationSchema.safeParse({ code: "!!" });
    expect(result.success).toBe(false);
  });
});
