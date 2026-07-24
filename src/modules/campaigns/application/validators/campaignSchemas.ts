// ============================================================================
// src/modules/campaigns/application/validators/campaignSchemas.ts
//
// Input validation for the Campaign aggregate's Server Actions/API Route
// Handlers. `organizationId` is deliberately never part of these schemas —
// see organization's teamSchemas.ts's identical convention.
// ============================================================================

import { z } from "zod";

/** Matches Postgres's own `uuid` column acceptance rule — see organization's teamSchemas.ts's identical comment. */
const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const createCampaignSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(200),
  description: z.string().trim().max(4000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
});

export const changeCampaignStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]),
});

export const addCampaignMemberSchema = z.object({
  userId: uuidSchema,
  allocationWeight: z.coerce.number().positive().max(9999).optional(),
});

export const assignCampaignLeadsSchema = z
  .object({
    leadIds: z.array(uuidSchema).min(1, "Select at least one Lead to assign."),
    allocationMethod: z.enum(["EQUAL", "PERCENTAGE"]),
    /** Required, and must sum to 100, only when allocationMethod is PERCENTAGE. */
    percentages: z.record(uuidSchema, z.coerce.number().min(0).max(100)).optional(),
  })
  .refine(
    (input) =>
      input.allocationMethod !== "PERCENTAGE" || Object.keys(input.percentages ?? {}).length > 0,
    { message: "Percentages are required for PERCENTAGE allocation.", path: ["percentages"] },
  );

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ChangeCampaignStatusInput = z.infer<typeof changeCampaignStatusSchema>;
export type AddCampaignMemberInput = z.infer<typeof addCampaignMemberSchema>;
export type AssignCampaignLeadsInput = z.infer<typeof assignCampaignLeadsSchema>;
