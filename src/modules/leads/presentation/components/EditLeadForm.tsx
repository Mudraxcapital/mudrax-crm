"use client";

// ============================================================================
// src/modules/leads/presentation/components/EditLeadForm.tsx
// ============================================================================

import { useActionState } from "react";
import type { LeadDto } from "../../application/dto/LeadDto";
import type { LeadFormState } from "../controllers/createLead.action";

const initialState: LeadFormState = {};

type UpdateLeadFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function EditLeadForm({ action, lead }: { action: UpdateLeadFormAction; lead: LeadDto }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullNameSnapshot" className="text-foreground/80 text-sm font-medium">
          Lead name
        </label>
        <input
          id="fullNameSnapshot"
          name="fullNameSnapshot"
          type="text"
          required
          maxLength={200}
          defaultValue={lead.fullNameSnapshot}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phoneSnapshot" className="text-foreground/80 text-sm font-medium">
            Phone
          </label>
          <input
            id="phoneSnapshot"
            name="phoneSnapshot"
            type="tel"
            defaultValue={lead.phoneSnapshot ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emailSnapshot" className="text-foreground/80 text-sm font-medium">
            Email
          </label>
          <input
            id="emailSnapshot"
            name="emailSnapshot"
            type="email"
            defaultValue={lead.emailSnapshot ?? ""}
            className={inputClass}
          />
        </div>
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
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
