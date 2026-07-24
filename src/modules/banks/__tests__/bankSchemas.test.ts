import { describe, expect, it } from "vitest";
import { createBankSchema, createCommissionPolicySchema } from "../application/validators/bankSchemas";

describe("bankSchemas", () => {
  it("accepts a valid bank", () => {
    const parsed = createBankSchema.safeParse({ name: "HDFC Bank", code: "HDFC" });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty bank name", () => {
    const parsed = createBankSchema.safeParse({ name: "", code: "HDFC" });
    expect(parsed.success).toBe(false);
  });

  it("accepts commission policy rate", () => {
    const parsed = createCommissionPolicySchema.safeParse({ ratePercent: 1.25 });
    expect(parsed.success).toBe(true);
  });
});
