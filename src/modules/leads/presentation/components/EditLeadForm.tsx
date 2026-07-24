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

const inputClass = "mx-input";

export function EditLeadForm({ action, lead }: { action: UpdateLeadFormAction; lead: LeadDto }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullNameSnapshot" className="mx-label">
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
          <label htmlFor="phoneSnapshot" className="mx-label">
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
          <label htmlFor="emailSnapshot" className="mx-label">
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
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mx-btn mx-btn-primary mt-1"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
