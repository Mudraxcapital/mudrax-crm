// ============================================================================
// src/modules/organization/application/validators/departmentSchemas.ts
//
// Input validation for the Department aggregate's Server Actions/API Route
// Handlers. Field limits mirror prisma/models/organization.prisma's
// Department model column constraints exactly. `organizationId` is
// deliberately never part of these schemas — see branchSchemas.ts's
// identical comment.
// ============================================================================

import { z } from "zod";

/** Uppercase, admin-facing short identifier — mirrors the seeded convention (e.g. "SALES"). */
const departmentCodePattern = /^[A-Z0-9][A-Z0-9_-]{1,49}$/;

export const createDepartmentSchema = z.object({
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
      departmentCodePattern,
      "Code must be 2-50 uppercase letters, digits, underscores, or hyphens.",
    ),
  isArchived: z.boolean().default(false),
});

export const updateDepartmentSchema = z.object({
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
      departmentCodePattern,
      "Code must be 2-50 uppercase letters, digits, underscores, or hyphens.",
    )
    .optional(),
  isArchived: z.boolean().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
