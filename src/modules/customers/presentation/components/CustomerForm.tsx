"use client";

// ============================================================================
// src/modules/customers/presentation/components/CustomerForm.tsx
//
// Create form for the Customer aggregate (identifiers are write-once here —
// editing an existing Customer only updates the lightweight identity
// fields, see EditCustomerForm below, matching customers.md: "Customer
// stays deliberately lightweight").
// ============================================================================

import { useActionState } from "react";
import type {
  CreateCustomerFormAction,
  CustomerFormState,
} from "../controllers/createCustomer.action";

const initialState: CustomerFormState = {};

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function CustomerForm({ action }: { action: CreateCustomerFormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-foreground/80 text-sm font-medium">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          maxLength={200}
          placeholder="Rahul Sharma"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dob" className="text-foreground/80 text-sm font-medium">
          Date of birth
        </label>
        <input id="dob" name="dob" type="date" className={inputClass} />
      </div>

      <p className="text-foreground/60 text-xs">
        Provide at least one identifier. PAN and Aadhaar must be unique across the Customer base.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pan" className="text-foreground/80 text-sm font-medium">
            PAN
          </label>
          <input
            id="pan"
            name="pan"
            type="text"
            maxLength={10}
            placeholder="ABCPS1234D"
            className={`${inputClass} font-mono uppercase`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="aadhaar" className="text-foreground/80 text-sm font-medium">
            Aadhaar
          </label>
          <input
            id="aadhaar"
            name="aadhaar"
            type="text"
            maxLength={12}
            placeholder="123412341234"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-foreground/80 text-sm font-medium">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+919876543210"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-foreground/80 text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="rahul.sharma@example.com"
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
        {isPending ? "Saving…" : "Create Customer"}
      </button>
    </form>
  );
}
