"use server";

// ============================================================================
// src/modules/auth/presentation/controllers/login.action.ts
//
// Server Action backing the login form (src/modules/auth/presentation/
// components/LoginForm.tsx). Auth.js's `signIn` performs the actual sign-in;
// CSRF protection is Auth.js's own default (double-submit cookie), not
// reimplemented here.
//
// Important: use signIn({ redirect: false }) + next/navigation redirect.
// Auth.js redirectTo builds an absolute URL from AUTH_URL (often
// http://localhost:3000), which breaks LAN access from other devices.
// Next.js relative redirects keep the host the user actually opened.
// ============================================================================

import { redirect } from "next/navigation";
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
const RATE_LIMIT_ERROR =
  "Too many login attempts. Please wait a minute and try again.";

/** Max credential posts per email per rolling window. */
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_SECONDS = 60;

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
    const { checkRateLimit } = await import("@/infra/redis/rateLimit");
    const rate = await checkRateLimit({
      key: `login:${parsed.data.email.toLowerCase()}`,
      limit: LOGIN_RATE_LIMIT,
      windowSeconds: LOGIN_RATE_WINDOW_SECONDS,
    });
    if (!rate.allowed) {
      return { error: RATE_LIMIT_ERROR };
    }
  } catch {
    // Redis optional — never block login if the limiter cannot load.
  }

  try {
    // callbackUrl is already sanitized by loginSchema → safeCallbackUrl.
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result && typeof result === "object" && "error" in result && result.error) {
      const code =
        "code" in result && typeof result.code === "string" ? result.code : undefined;
      if (code === "account_disabled") {
        return { error: ACCOUNT_DISABLED_ERROR };
      }
      if (code === "account_suspended") {
        return { error: ACCOUNT_SUSPENDED_ERROR };
      }
      return { error: GENERIC_ERROR };
    }

    redirect(parsed.data.callbackUrl);
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
    // Next.js `redirect()` throws an internal signal — never swallow it.
    throw error;
  }
}
