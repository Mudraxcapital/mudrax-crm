import { describe, expect, it } from "vitest";
import {
  recordDisbursementSchema,
  updateCommissionStatusSchema,
} from "../application/validators/disbursementSchemas";

const uuid = "11111111-1111-1111-1111-111111111111";

describe("disbursementSchemas", () => {
  it("accepts a valid disbursement record", () => {
    const parsed = recordDisbursementSchema.safeParse({
      loanApplicationId: uuid,
      bankReferenceNumber: "REF-1",
      amount: "100000.00",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts commission status progression", () => {
    const parsed = updateCommissionStatusSchema.safeParse({ status: "INVOICED" });
    expect(parsed.success).toBe(true);
  });
});
