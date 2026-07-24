"use client";
import { useActionState } from "react";
import { COMMISSION_STATUSES } from "../../domain/entities/Commission";
import type { DisbursementsFormState } from "../controllers/disbursementsFormState";
const initialState: DisbursementsFormState = {};
const inputClass = "mx-input";
type FormAction = (s: DisbursementsFormState | undefined, fd: FormData) => Promise<DisbursementsFormState>;

export function CommissionStatusForm({ action, current }: { action: FormAction; current: string }) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <select name="status" defaultValue={current} className={inputClass}>
        {COMMISSION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button type="submit" disabled={isPending} className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm disabled:opacity-60">
        {isPending ? "Saving…" : "Update commission status"}
      </button>
    </form>
  );
}
