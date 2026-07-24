"use client";

// ============================================================================
// src/modules/auth/presentation/components/LoginForm.tsx
// ============================================================================

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "../controllers/login.action";
import { Button } from "@/shared/ui/Button";
import { Field, Input } from "@/shared/ui/Input";

const initialState: LoginActionState = {};

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

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
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          invalid={!!state.error}
        />
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
