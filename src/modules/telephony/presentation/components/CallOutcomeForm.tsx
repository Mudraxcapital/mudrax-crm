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

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

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
        <label className="text-foreground/80 text-sm font-medium">Name</label>
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
        <label className="text-foreground/80 text-sm font-medium">Sort order</label>
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
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : outcome ? "Save" : "Add Outcome"}
      </button>
    </form>
  );
}
