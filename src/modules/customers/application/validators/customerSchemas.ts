// ============================================================================
// src/modules/customers/application/validators/customerSchemas.ts
//
// Input validation for the Customer aggregate's Server Actions/API Route
// Handlers. Field limits mirror prisma/models/customers.prisma's Customer/
// CustomerIdentifier model column constraints. `organizationId` is
// deliberately never part of these schemas — it is taken from the acting
// User's own Authorization Context, matching organizationSchemas.ts's
// identical convention.
// ============================================================================

import { z } from "zod";

const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const aadhaarPattern = /^[0-9]{12}$/;
const phonePattern = /^\+?[0-9]{7,15}$/;

export const identifierInputSchema = z
  .object({
    type: z.enum(["PAN", "AADHAAR", "PHONE", "EMAIL"]),
    value: z.string().trim().min(1, "Identifier value is required."),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PAN" && !panPattern.test(data.value.toUpperCase())) {
      ctx.addIssue({
        code: "custom",
        message: "PAN must be in the format ABCDE1234F.",
        path: ["value"],
      });
    }
    if (data.type === "AADHAAR" && !aadhaarPattern.test(data.value.replace(/\s/g, ""))) {
      ctx.addIssue({
        code: "custom",
        message: "Aadhaar must be exactly 12 digits.",
        path: ["value"],
      });
    }
    if (data.type === "PHONE" && !phonePattern.test(data.value.replace(/[\s-]/g, ""))) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number.", path: ["value"] });
    }
    if (data.type === "EMAIL" && !z.email().safeParse(data.value).success) {
      ctx.addIssue({ code: "custom", message: "Enter a valid email address.", path: ["value"] });
    }
  });

export type IdentifierInput = z.infer<typeof identifierInputSchema>;

export const createCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(200, "Full name must be at most 200 characters."),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format.")
    .optional(),
  identifiers: z
    .array(identifierInputSchema)
    .min(1, "At least one identifier (PAN, Aadhaar, Phone, or Email) is required."),
});

export const updateCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(200, "Full name must be at most 200 characters.")
    .optional(),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format.")
    .optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
