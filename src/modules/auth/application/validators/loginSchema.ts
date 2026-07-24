// ============================================================================
// src/modules/auth/application/validators/loginSchema.ts
//
// Input validation for the login form/Server Action — a presentation-layer
// concern that never reaches `authenticateUser` with malformed input.
// ============================================================================

import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  callbackUrl: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
