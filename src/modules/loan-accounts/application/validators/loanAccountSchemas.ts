import { z } from "zod";
const uuidSchema = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Must be a valid id.");
const moneySchema = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount.");
const rateSchema = z.string().trim().regex(/^\d+(\.\d{1,3})?$/, "Must be a valid rate.");

export const openLoanAccountSchema = z.object({
  originatingApplicationId: uuidSchema,
  customerId: uuidSchema,
  bankId: uuidSchema,
  bankBranchId: uuidSchema.optional().nullable(),
  loanProductId: uuidSchema,
  sanctionedAmount: moneySchema,
  interestRateSnapshot: rateSchema,
  tenureMonthsSnapshot: z.coerce.number().int().min(1).max(600),
});

export type OpenLoanAccountInput = z.infer<typeof openLoanAccountSchema>;
