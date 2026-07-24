"use client";

// ============================================================================
// src/modules/follow-ups/presentation/components/CompleteFollowUpForm.tsx
// ============================================================================

import { useActionState } from "react";
import type { FollowUpFormState } from "../controllers/createFollowUp.action";

const initialState: FollowUpFormState = {};

type CompleteFollowUpFormAction = (
  state: FollowUpFormState | undefined,
  formData: FormData,
) => Promise<FollowUpFormState>;

export function CompleteFollowUpForm({ action }: { action: CompleteFollowUpFormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="outcomeNotes"
        rows={2}
        maxLength={4000}
        placeholder="Outcome notes (optional)…"
        className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
      />

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
      >
        {isPending ? "Completing…" : "Mark Completed"}
      </button>
    </form>
  );
}
