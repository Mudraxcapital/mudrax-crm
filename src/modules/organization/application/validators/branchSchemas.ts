// ============================================================================
// src/modules/organization/application/validators/branchSchemas.ts
//
// Input validation for the Branch aggregate's Server Actions/API Route
// Handlers. Field limits mirror prisma/models/organization.prisma's Branch
// model column constraints exactly. `organizationId` is deliberately never
// part of these schemas — it is always taken from the acting User's own
// Authorization Context (session.authContext.organizationId), never from
// client-supplied input, so a request can never create/target a Branch in
// an Organization other than the caller's own.
// ============================================================================

import { z } from "zod";

/** Uppercase, admin-facing short identifier — mirrors the seeded convention (e.g. "MUM-HO"). */
const branchCodePattern = /^[A-Z0-9][A-Z0-9_-]{1,49}$/;

export const createBranchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(150, "Name must be at most 150 characters."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      branchCodePattern,
      "Code must be 2-50 uppercase letters, digits, underscores, or hyphens.",
    ),
  address: z.string().trim().max(2000, "Address must be at most 2000 characters.").optional(),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(64, "Timezone must be at most 64 characters.")
    .default("Asia/Kolkata"),
  isArchived: z.boolean().default(false),
});

export const updateBranchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(150, "Name must be at most 150 characters.")
    .optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      branchCodePattern,
      "Code must be 2-50 uppercase letters, digits, underscores, or hyphens.",
    )
    .optional(),
  address: z
    .string()
    .trim()
    .max(2000, "Address must be at most 2000 characters.")
    .nullable()
    .optional(),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(64, "Timezone must be at most 64 characters.")
    .optional(),
  isArchived: z.boolean().optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
