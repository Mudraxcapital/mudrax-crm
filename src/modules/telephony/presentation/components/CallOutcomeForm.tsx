"use client";

// ============================================================================
// src/modules/telephony/presentation/components/CallOutcomeForm.tsx
//
// Create/edit form for a single Call Outcome catalog entry. `outcome`
// present means "edit an existing entry" (updateCallOutcomeAction
// pre-bound); absent means "create a new entry".
// ============================================================================

import { useActionState } from "react";
import type { CallOutcomeDto } from "../../application/dto/CallOutcomeDto";
import type { TelephonyFormState } from "../controllers/initiateClickToCall.action";

const initialState: TelephonyFormState = {};

type CallOutcomeFormAction = (
  state: TelephonyFormState | undefined,
  formData: FormData,
) => Promise<TelephonyFormState>;

const inputClass = "mx-input";

export function CallOutcomeForm({
  action,
  outcome,
}: {
  action: CallOutcomeFormAction;
  outcome?: CallOutcomeDto;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="mx-label">Name</label>
        <input
          name="name"
          type="text"
          required
          maxLength={150}
          defaultValue={outcome?.name}
          placeholder="e.g. Interested"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="mx-label">Sort order</label>
        <input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={outcome?.sortOrder ?? 0}
          className={`${inputClass} w-24`}
        />
      </div>
      {outcome ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={outcome.isActive} />
          Active
        </label>
      ) : null}

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mx-btn mx-btn-primary"
      >
        {isPending ? "Saving…" : outcome ? "Save" : "Add Outcome"}
      </button>
    </form>
  );
}
