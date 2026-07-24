import { z } from "zod";
import { APPLICATION_TYPES } from "../../domain/entities/LoanApplication";
import { ELIGIBILITY_DECISIONS, ELIGIBILITY_METHODS } from "../../domain/entities/EligibilitySnapshot";

const uuidSchema = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Must be a valid id.");
const moneySchema = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount.");
const rateSchema = z.string().trim().regex(/^\d+(\.\d{1,3})?$/, "Must be a valid rate.");

export const createLoanApplicationSchema = z.object({
  customerId: uuidSchema,
  leadId: uuidSchema,
  loanProductId: uuidSchema,
  bankBranchId: uuidSchema.optional().nullable(),
  loanOfferId: uuidSchema.optional().nullable(),
  applicationType: z.enum(APPLICATION_TYPES).optional(),
  originatingLoanAccountId: uuidSchema.optional().nullable(),
  requestedAmount: moneySchema,
  requestedTenureMonths: z.coerce.number().int().min(1).max(600),
});

export const updateLoanApplicationSchema = z.object({
  bankBranchId: uuidSchema.optional().nullable(),
  requestedAmount: moneySchema.optional(),
  requestedTenureMonths: z.coerce.number().int().min(1).max(600).optional(),
});

export const decideLoanApplicationSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().trim().max(2000).optional(),
}).superRefine((d, ctx) => {
  if (d.decision === "REJECT" && !d.rejectionReason) {
    ctx.addIssue({ code: "custom", message: "Rejection reason is required.", path: ["rejectionReason"] });
  }
});

export const createEligibilitySchema = z.object({
  customerId: uuidSchema,
  loanApplicationId: uuidSchema.optional().nullable(),
  method: z.enum(ELIGIBILITY_METHODS).default("MANUAL"),
  monthlyIncome: moneySchema,
  monthlyObligations: moneySchema.optional(),
  decision: z.enum(ELIGIBILITY_DECISIONS),
  maxEligibleAmount: moneySchema,
});

export const createLoanOfferSchema = z.object({
  leadId: uuidSchema,
  eligibilitySnapshotId: uuidSchema,
  bankId: uuidSchema,
  loanProductId: uuidSchema,
  offeredAmount: moneySchema,
  offeredInterestRate: rateSchema,
  offeredTenureMonths: z.coerce.number().int().min(1).max(600),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const decideLoanOfferSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT"]),
});

export type CreateLoanApplicationInput = z.infer<typeof createLoanApplicationSchema>;
export type UpdateLoanApplicationInput = z.infer<typeof updateLoanApplicationSchema>;
export type DecideLoanApplicationInput = z.infer<typeof decideLoanApplicationSchema>;
export type CreateEligibilityInput = z.infer<typeof createEligibilitySchema>;
export type CreateLoanOfferInput = z.infer<typeof createLoanOfferSchema>;
export type DecideLoanOfferInput = z.infer<typeof decideLoanOfferSchema>;
