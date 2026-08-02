// ============================================================================
// src/modules/auth/application/validators/loginSchema.ts
//
// Input validation for the login form/Server Action — a presentation-layer
// concern that never reaches `authenticateUser` with malformed input.
// ============================================================================

import { z } from "zod";
import { safeCallbackUrl } from "./safeCallbackUrl";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter a valid email address.")
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Password is required."),
  callbackUrl: z
    .string()
    .optional()
    .transform((value) => safeCallbackUrl(value)),
});

export type LoginInput = z.infer<typeof loginSchema>;
