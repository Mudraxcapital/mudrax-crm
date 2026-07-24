"use client";

// ============================================================================
// src/modules/auth/presentation/components/LoginForm.tsx
// ============================================================================

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "../controllers/login.action";

const initialState: LoginActionState = {};

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground/80 text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@mudraxcapital.com"
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-foreground/80 text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background mt-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
