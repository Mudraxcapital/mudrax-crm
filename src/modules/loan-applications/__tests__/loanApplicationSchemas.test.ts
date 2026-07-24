import { describe, expect, it } from "vitest";
import {
  createLoanApplicationSchema,
  decideLoanApplicationSchema,
  decideLoanOfferSchema,
} from "../application/validators/loanApplicationSchemas";

const uuid = "11111111-1111-1111-1111-111111111111";

describe("loanApplicationSchemas", () => {
  it("accepts a valid application", () => {
    const parsed = createLoanApplicationSchema.safeParse({
      customerId: uuid,
      leadId: uuid,
      loanProductId: uuid,
      requestedAmount: "500000",
      requestedTenureMonths: 36,
    });
    expect(parsed.success).toBe(true);
  });

  it("requires rejection reason when rejecting", () => {
    const parsed = decideLoanApplicationSchema.safeParse({ decision: "REJECT" });
    expect(parsed.success).toBe(false);
  });

  it("accepts offer accept decision", () => {
    const parsed = decideLoanOfferSchema.safeParse({ decision: "ACCEPT" });
    expect(parsed.success).toBe(true);
  });
});
