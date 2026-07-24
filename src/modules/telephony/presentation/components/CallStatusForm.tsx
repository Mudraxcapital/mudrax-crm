"use client";

// ============================================================================
// src/modules/telephony/presentation/components/CallStatusForm.tsx
//
// Call Attempt lifecycle-status transition form, with an optional Call
// Outcome selection (docs/modules/telephony.md — "Call outcomes must be
// configurable").
// ============================================================================

import { useActionState } from "react";
import type { CallStatus } from "../../domain/entities/CallAttempt";
import type { TelephonyFormState } from "../controllers/initiateClickToCall.action";

const initialState: TelephonyFormState = {};

type CallStatusFormAction = (
  state: TelephonyFormState | undefined,
  formData: FormData,
) => Promise<TelephonyFormState>;

const inputClass = "mx-input";

const SELECTABLE_STATUSES: CallStatus[] = [
  "RINGING",
  "ANSWERED",
  "ON_HOLD",
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "ABANDONED",
];

export function CallStatusForm({
  action,
  outcomes,
}: {
  action: CallStatusFormAction;
  outcomes: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="mx-label">
            New status
          </label>
          <select id="status" name="status" required className={inputClass}>
            {SELECTABLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="callOutcomeId" className="mx-label">
            Call Outcome (optional)
          </label>
          <select id="callOutcomeId" name="callOutcomeId" className={inputClass}>
            <option value="">— None —</option>
            {outcomes.map((outcome) => (
              <option key={outcome.id} value={outcome.id}>
                {outcome.name}
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
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Update Status"}
      </button>
    </form>
  );
}
