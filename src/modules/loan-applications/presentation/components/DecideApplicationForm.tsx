"use client";
import { useActionState } from "react";
import type { LoanApplicationsFormState } from "../controllers/loanApplicationsFormState";
const initialState: LoanApplicationsFormState = {};
const inputClass = "mx-input";
type FormAction = (s: LoanApplicationsFormState | undefined, fd: FormData) => Promise<LoanApplicationsFormState>;

export function DecideApplicationForm({ action }: { action: FormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="decision" className="text-sm font-medium">Decision</label>
        <select id="decision" name="decision" required className={inputClass}>
          <option value="APPROVE">Approve</option>
          <option value="REJECT">Reject</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rejectionReason" className="text-sm font-medium">Rejection reason (if rejecting)</label>
        <textarea id="rejectionReason" name="rejectionReason" rows={2} className={inputClass} />
      </div>
      {state.error ? <p role="alert" className="text-sm text-red-600">{state.error}</p> : null}
      <button type="submit" disabled={isPending} className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
        {isPending ? "Saving…" : "Record decision"}
      </button>
    </form>
  );
}
