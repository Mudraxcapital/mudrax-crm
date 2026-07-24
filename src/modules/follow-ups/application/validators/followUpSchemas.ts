// ============================================================================
// src/modules/follow-ups/application/validators/followUpSchemas.ts
//
// Input validation for the Follow-up aggregate's Server Actions/API Route
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

const triggerTypeSchema = z.enum(["FOLLOW_UP", "CALL_LATER"]);

export const createFollowUpSchema = z.object({
  leadId: uuidSchema,
  triggerType: triggerTypeSchema,
  scheduledFor: z.coerce.date(),
  currentAssigneeUserId: uuidSchema.optional(),
});

export const updateFollowUpSchema = z.object({
  triggerType: triggerTypeSchema.optional(),
  scheduledFor: z.coerce.date().optional(),
  outcomeNotes: z.string().trim().max(4000).nullable().optional(),
});

export const completeFollowUpSchema = z.object({
  outcomeNotes: z.string().trim().max(4000).nullable().optional(),
});

export const reassignFollowUpSchema = z.object({
  toUserId: uuidSchema,
  reason: z.string().trim().max(1000).nullable().optional(),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;
export type ReassignFollowUpInput = z.infer<typeof reassignFollowUpSchema>;
