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

const inputClass = "mx-input";

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
        <label htmlFor="fullName" className="mx-label">
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
        <label htmlFor="dob" className="mx-label">
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
