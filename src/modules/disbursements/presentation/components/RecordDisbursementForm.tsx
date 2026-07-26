"use client";
import { useActionState } from "react";
import type { DisbursementsFormState } from "../controllers/disbursementsFormState";

const initialState: DisbursementsFormState = {};
const inputClass = "mx-input";
type FormAction = (
  s: DisbursementsFormState | undefined,
  fd: FormData,
) => Promise<DisbursementsFormState>;

export function RecordDisbursementForm({
  action,
  applications = [],
}: {
  action: FormAction;
  applications?: { id: string; label: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {applications.length > 0 ? (
        <select name="loanApplicationId" required className={inputClass} defaultValue="">
          <option value="">Select approved application…</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name="loanApplicationId"
          placeholder="Approved application"
          required
          className={inputClass}
        />
      )}
      <input
        name="bankReferenceNumber"
        placeholder="Bank reference number"
        required
        className={inputClass}
      />
      <input name="amount" placeholder="Amount" required className={inputClass} />
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm disabled:opacity-60"
      >
        {isPending ? "Recording…" : "Record Disbursement"}
      </button>
    </form>
  );
}
