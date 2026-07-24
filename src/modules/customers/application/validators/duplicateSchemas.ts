// ============================================================================
// src/modules/customers/application/validators/duplicateSchemas.ts
// ============================================================================

import { z } from "zod";

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const mergeCustomersSchema = z.object({
  survivingCustomerId: uuidSchema,
  mergedAwayCustomerId: uuidSchema,
  duplicateCandidateId: uuidSchema.optional(),
  reason: z.string().trim().max(2000).optional(),
});

export const dismissDuplicateSchema = z.object({
  candidateId: uuidSchema,
});

export type MergeCustomersInput = z.infer<typeof mergeCustomersSchema>;
export type DismissDuplicateInput = z.infer<typeof dismissDuplicateSchema>;
