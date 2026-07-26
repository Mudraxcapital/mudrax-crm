"use client";

// ============================================================================
// src/modules/auth/presentation/components/LoginForm.tsx
// ============================================================================

import { useActionState, useState } from "react";
import { loginAction } from "../controllers/login.action";
import { Button } from "@/shared/ui/Button";
import { Field, Input } from "@/shared/ui/Input";

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: initialError,
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@mudraxcapital.com"
          invalid={!!state.error}
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            invalid={!!state.error}
            className="pr-12"
          />
          <button
            type="button"
            className="text-muted hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      {state.error ? (
        <p role="alert" className="mx-error rounded-md border border-danger/20 bg-danger-muted px-3 py-2">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" loading={isPending} className="mt-1 w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
