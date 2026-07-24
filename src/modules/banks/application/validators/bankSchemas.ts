import { z } from "zod";
import { BANK_STATUSES } from "../../domain/entities/Bank";
import { BANK_BRANCH_STATUSES } from "../../domain/entities/BankBranch";

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const createBankSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200, "Name is too long."),
  code: z.string().trim().min(1, "Code is required.").max(50, "Code is too long."),
  status: z.enum(BANK_STATUSES).optional(),
});

export const updateBankSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200, "Name is too long.").optional(),
  code: z.string().trim().min(1, "Code is required.").max(50, "Code is too long.").optional(),
  status: z.enum(BANK_STATUSES).optional(),
});

export const createBankBranchSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200, "Name is too long."),
  code: z.string().trim().min(1, "Code is required.").max(50, "Code is too long."),
  address: z.string().trim().max(4000, "Address is too long.").optional(),
  status: z.enum(BANK_BRANCH_STATUSES).optional(),
});

export const updateBankBranchSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200, "Name is too long.").optional(),
  code: z.string().trim().min(1, "Code is required.").max(50, "Code is too long.").optional(),
  address: z.string().trim().max(4000, "Address is too long.").nullable().optional(),
  status: z.enum(BANK_BRANCH_STATUSES).optional(),
});

export const createCommissionPolicySchema = z.object({
  loanProductId: uuidSchema.nullable().optional(),
  ratePercent: z.coerce
    .number()
    .min(0, "Rate must be non-negative.")
    .max(100, "Rate must be at most 100."),
  clawbackWindowDays: z.coerce.number().int().min(0).max(3650).optional(),
});

export type CreateBankInput = z.infer<typeof createBankSchema>;
export type UpdateBankInput = z.infer<typeof updateBankSchema>;
export type CreateBankBranchInput = z.infer<typeof createBankBranchSchema>;
export type UpdateBankBranchInput = z.infer<typeof updateBankBranchSchema>;
export type CreateCommissionPolicyInput = z.infer<typeof createCommissionPolicySchema>;
