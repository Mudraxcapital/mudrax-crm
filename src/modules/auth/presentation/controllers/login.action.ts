"use server";

// ============================================================================
// src/modules/auth/presentation/controllers/login.action.ts
//
// Server Action backing the login form (src/modules/auth/presentation/
// components/LoginForm.tsx). Auth.js's `signIn` performs the actual sign-in
// + redirect; CSRF protection is Auth.js's own default (double-submit
// cookie), not reimplemented here.
// ============================================================================

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/infra/auth";
import { loginSchema } from "../../application/validators/loginSchema";

export interface LoginActionState {
  error?: string;
}

const GENERIC_ERROR = "Invalid email or password. Please try again.";
const ACCOUNT_DISABLED_ERROR =
  "Your account has been disabled. Contact your administrator.";
const ACCOUNT_SUSPENDED_ERROR =
  "Your account has been suspended. Contact your administrator.";

export async function loginAction(
  _previousState: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    // callbackUrl is already sanitized by loginSchema → safeCallbackUrl.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.callbackUrl,
    });
    return {};
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      if (error.code === "account_disabled") {
        return { error: ACCOUNT_DISABLED_ERROR };
      }
      if (error.code === "account_suspended") {
        return { error: ACCOUNT_SUSPENDED_ERROR };
      }
      return { error: GENERIC_ERROR };
    }
    if (error instanceof AuthError) {
      return { error: GENERIC_ERROR };
    }
    // Auth.js's successful `signIn` redirects by throwing Next.js's internal
    // redirect signal — never swallow it here.
    throw error;
  }
}
