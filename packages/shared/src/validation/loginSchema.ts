import { z } from "zod";

/** Client-safe login credentials schema (no Next.js callbackUrl transform). */
export const loginCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter a valid email address.")
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Password is required."),
});

export type LoginCredentialsInput = z.infer<typeof loginCredentialsSchema>;
