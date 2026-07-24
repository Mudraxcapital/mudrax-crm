// ============================================================================
// src/modules/leads/application/validators/leadSchemas.ts
//
// Input validation for the Lead aggregate's Server Actions/API Route
// Handlers. Field limits mirror prisma/models/leads.prisma's Lead model
// column constraints. `organizationId` is deliberately never part of these
// schemas — see organization's teamSchemas.ts's identical convention.
// ============================================================================

import { z } from "zod";

/** Matches Postgres's own `uuid` column acceptance rule — see organization's teamSchemas.ts's identical comment. */
const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const createLeadSchema = z.object({
  customerId: uuidSchema,
  leadSourceId: uuidSchema,
  currentStageId: uuidSchema.optional(),
  currentAssigneeUserId: uuidSchema.optional(),
  fullNameSnapshot: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(200, "Name must be at most 200 characters."),
  phoneSnapshot: z.string().trim().max(20).optional(),
  emailSnapshot: z.email("Enter a valid email address.").max(320).optional(),
});

export const updateLeadSchema = z.object({
  leadSourceId: uuidSchema.optional(),
  fullNameSnapshot: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(200, "Name must be at most 200 characters.")
    .optional(),
  phoneSnapshot: z.string().trim().max(20).nullable().optional(),
  emailSnapshot: z.email("Enter a valid email address.").max(320).nullable().optional(),
});

export const changeLeadStageSchema = z.object({
  stageId: uuidSchema,
  lostReasonId: uuidSchema.optional(),
});

export const assignLeadSchema = z.object({
  assignedToUserId: uuidSchema,
});

export const createLeadNoteSchema = z.object({
  body: z.string().trim().min(1, "Note body is required.").max(4000, "Note is too long."),
});

export const updateLeadNoteSchema = z.object({
  body: z.string().trim().min(1, "Note body is required.").max(4000, "Note is too long."),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ChangeLeadStageInput = z.infer<typeof changeLeadStageSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type CreateLeadNoteInput = z.infer<typeof createLeadNoteSchema>;
export type UpdateLeadNoteInput = z.infer<typeof updateLeadNoteSchema>;
