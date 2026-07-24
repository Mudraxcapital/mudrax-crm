"use client";

// ============================================================================
// src/modules/telephony/presentation/components/ClickToCallForm.tsx
//
// Click-to-Call form. `leads`/`customers`/`assignees` are fetched by the
// page (this module has no authority to list them itself) and rendered as
// selects. Exactly one of Lead/Customer must be chosen (Zod-enforced).
// ============================================================================

import { useActionState } from "react";
import type { TelephonyFormState } from "../controllers/initiateClickToCall.action";

const initialState: TelephonyFormState = {};

type ClickToCallFormAction = (
  state: TelephonyFormState | undefined,
  formData: FormData,
) => Promise<TelephonyFormState>;

const inputClass = "mx-input";

export function ClickToCallForm({
  action,
  leads,
  customers,
  assignees,
}: {
  action: ClickToCallFormAction;
  leads: { id: string; label: string }[];
  customers: { id: string; label: string }[];
  assignees: { id: string; fullName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leadId" className="mx-label">
            Lead (optional)
          </label>
          <select id="leadId" name="leadId" className={inputClass}>
            <option value="">— None —</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="customerId" className="mx-label">
            Customer (optional)
          </label>
          <select id="customerId" name="customerId" className={inputClass}>
            <option value="">— None —</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-muted text-xs">At least one of Lead / Customer is required.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="toPhoneNumber" className="mx-label">
            Phone number (optional)
          </label>
          <input
            id="toPhoneNumber"
            name="toPhoneNumber"
            type="tel"
            maxLength={20}
            placeholder="+919876543210"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="agentUserId" className="mx-label">
            Assign to Agent (optional)
          </label>
          <select id="agentUserId" name="agentUserId" className={inputClass}>
            <option value="">— Me —</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
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
        className="bg-foreground text-background mt-1 self-start rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Calling…" : "Click to Call"}
      </button>
    </form>
  );
}
