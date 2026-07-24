// ============================================================================
// src/modules/organization/application/validators/organizationSchemas.ts
//
// Input validation for the Organization aggregate's Server Actions/API
// Route Handlers — a presentation-layer concern that never reaches a
// use-case with malformed input. Field limits mirror
// prisma/models/organization.prisma's column constraints exactly.
// ============================================================================

import { z } from "zod";
import { ORGANIZATION_STATUSES } from "../../domain/entities/Organization";

/** Uppercase, admin-facing short identifier — mirrors the seeded convention (e.g. "MUDRAX"). */
const organizationCodePattern = /^[A-Z0-9][A-Z0-9_-]{1,49}$/;

export const organizationStatusSchema = z.enum(ORGANIZATION_STATUSES);

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(200, "Name must be at most 200 characters."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      organizationCodePattern,
      "Code must be 2-50 uppercase letters, digits, underscores, or hyphens.",
    ),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(64, "Timezone must be at most 64 characters.")
    .default("Asia/Kolkata"),
  status: organizationStatusSchema.default("ACTIVE"),
});

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(200, "Name must be at most 200 characters.")
    .optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      organizationCodePattern,
      "Code must be 2-50 uppercase letters, digits, underscores, or hyphens.",
    )
    .optional(),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(64, "Timezone must be at most 64 characters.")
    .optional(),
  status: organizationStatusSchema.optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
