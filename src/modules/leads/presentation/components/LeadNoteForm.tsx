"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadNoteForm.tsx
//
// Add/edit form for a single Lead Note. `note` present means "edit an
// existing Note" (updateLeadNoteAction pre-bound); absent means "add a new
// Note" (addLeadNoteAction pre-bound).
// ============================================================================

import { useActionState } from "react";
import type { LeadFormState } from "../controllers/createLead.action";

const initialState: LeadFormState = {};

type LeadNoteFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

export function LeadNoteForm({
  action,
  defaultBody,
  submitLabel,
}: {
  action: LeadNoteFormAction;
  defaultBody?: string;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="body"
        required
        maxLength={4000}
        rows={3}
        defaultValue={defaultBody}
        placeholder="Add a note about this Lead…"
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
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
