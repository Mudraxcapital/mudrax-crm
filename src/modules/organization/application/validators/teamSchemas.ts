// ============================================================================
// src/modules/organization/application/validators/teamSchemas.ts
//
// Input validation for the Team aggregate's Server Actions/API Route
// Handlers. Field limits mirror prisma/models/organization.prisma's Team
// model column constraints exactly. `organizationId` is deliberately never
// part of these schemas — see branchSchemas.ts's identical comment.
// `branchId`, when provided, is validated as a well-formed UUID here; its
// existence within the same Organization is checked by the use-case
// (createTeam.ts/updateTeam.ts) against BranchRepository. Callers translate
// an empty-selection form value to `undefined` (create, "no Branch") or
// `null` (update, "clear the Branch") before parsing — see
// createTeam.action.ts/updateTeam.action.ts.
// ============================================================================

import { z } from "zod";

/** Uppercase, admin-facing short identifier — mirrors the seeded convention (e.g. "MUM-SALES"). */
const teamCodePattern = /^[A-Z0-9][A-Z0-9_-]{1,49}$/;

/**
 * Deliberately more permissive than Zod's built-in `z.uuid()` (which only
 * accepts RFC 4122 version 1-8 / variant 8-b UUIDs): Postgres's own `uuid`
 * column type (prisma/models/organization.prisma's `@db.Uuid`) accepts any
 * 32-hex-digit, dash-grouped value regardless of version/variant nibbles, so
 * this schema matches the database's actual acceptance rule instead of a
 * stricter one the database itself does not enforce.
 */
const branchIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Branch id must be a valid UUID.",
  );

export const createTeamSchema = z.object({
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
      teamCodePattern,
      "Code must be 2-50 uppercase letters, digits, underscores, or hyphens.",
    ),
  branchId: branchIdSchema.optional(),
  isArchived: z.boolean().default(false),
});

export const updateTeamSchema = z.object({
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
    .regex(teamCodePattern, "Code must be 2-50 uppercase letters, digits, underscores, or hyphens.")
    .optional(),
  branchId: branchIdSchema.nullable().optional(),
  isArchived: z.boolean().optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
