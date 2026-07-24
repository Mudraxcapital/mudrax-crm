import { z } from "zod";
import { LOAN_PRODUCT_STATUSES } from "../../domain/entities/LoanProduct";

const uuidSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Must be a valid id.");

const moneySchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount.");

const rateSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,3})?$/, "Must be a valid interest rate.");

export const createLoanProductSchema = z
  .object({
    bankId: uuidSchema,
    loanProductTypeId: uuidSchema,
    variant: z.string().trim().min(1).max(100).default("Standard"),
    name: z.string().trim().min(1).max(200),
    status: z.enum(LOAN_PRODUCT_STATUSES).optional(),
    minInterestRate: rateSchema,
    maxInterestRate: rateSchema,
    minTenureMonths: z.coerce.number().int().min(1).max(600),
    maxTenureMonths: z.coerce.number().int().min(1).max(600),
    minLoanAmount: moneySchema,
    maxLoanAmount: moneySchema,
    eligibilityRulesJson: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (Number(data.minInterestRate) > Number(data.maxInterestRate)) {
      ctx.addIssue({ code: "custom", message: "Min interest rate must be <= max.", path: ["minInterestRate"] });
    }
    if (data.minTenureMonths > data.maxTenureMonths) {
      ctx.addIssue({ code: "custom", message: "Min tenure must be <= max.", path: ["minTenureMonths"] });
    }
    if (Number(data.minLoanAmount) > Number(data.maxLoanAmount)) {
      ctx.addIssue({ code: "custom", message: "Min amount must be <= max.", path: ["minLoanAmount"] });
    }
  });

export const updateLoanProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    status: z.enum(LOAN_PRODUCT_STATUSES).optional(),
    minInterestRate: rateSchema.optional(),
    maxInterestRate: rateSchema.optional(),
    minTenureMonths: z.coerce.number().int().min(1).max(600).optional(),
    maxTenureMonths: z.coerce.number().int().min(1).max(600).optional(),
    minLoanAmount: moneySchema.optional(),
    maxLoanAmount: moneySchema.optional(),
    eligibilityRulesJson: z.string().optional(),
  });

export type CreateLoanProductInput = z.infer<typeof createLoanProductSchema>;
export type UpdateLoanProductInput = z.infer<typeof updateLoanProductSchema>;
