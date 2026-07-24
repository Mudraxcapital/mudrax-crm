"use client";

// ============================================================================
// src/modules/customers/presentation/components/EditCustomerForm.tsx
//
// Edit form for a Customer's lightweight identity fields only — identifier
// management is a separate, not-yet-exposed capability (see CustomerForm.tsx
// header comment).
// ============================================================================

import { useActionState } from "react";
import type { CustomerDto } from "../../application/dto/CustomerDto";
import type { CustomerFormState } from "../controllers/createCustomer.action";

const initialState: CustomerFormState = {};

type EditCustomerFormAction = (
  state: CustomerFormState | undefined,
  formData: FormData,
) => Promise<CustomerFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function EditCustomerForm({
  action,
  customer,
}: {
  action: EditCustomerFormAction;
  customer: CustomerDto;
}) {
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
          defaultValue={customer.fullName}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dob" className="text-foreground/80 text-sm font-medium">
          Date of birth
        </label>
        <input
          id="dob"
          name="dob"
          type="date"
          defaultValue={customer.dob ?? ""}
          className={inputClass}
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
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
