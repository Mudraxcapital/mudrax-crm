import { z } from "zod";
import { COMMISSION_STATUSES } from "../../domain/entities/Commission";

const uuidSchema = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Must be a valid id.");
const moneySchema = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount.");

export const recordDisbursementSchema = z.object({
  loanApplicationId: uuidSchema,
  bankReferenceNumber: z.string().trim().min(1).max(100),
  amount: moneySchema,
  scheduledAt: z.string().datetime().optional().nullable(),
  markDisbursed: z.boolean().optional(),
});

export const updateDisbursementStatusSchema = z.object({
  status: z.enum(["DISBURSED", "RECONCILED", "REVERSED", "FAILED"]),
  reversalReason: z.string().trim().max(2000).optional(),
});

export const updateCommissionStatusSchema = z.object({
  status: z.enum(COMMISSION_STATUSES),
});

export type RecordDisbursementInput = z.infer<typeof recordDisbursementSchema>;
export type UpdateDisbursementStatusInput = z.infer<typeof updateDisbursementStatusSchema>;
export type UpdateCommissionStatusInput = z.infer<typeof updateCommissionStatusSchema>;
