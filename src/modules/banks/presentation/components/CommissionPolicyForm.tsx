"use client";

import { useActionState } from "react";
import type { BanksFormState } from "../controllers/banksFormState";

const initialState: BanksFormState = {};
const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

type FormAction = (state: BanksFormState | undefined, formData: FormData) => Promise<BanksFormState>;

export function CommissionPolicyForm({ action }: { action: FormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ratePercent" className="text-foreground/80 text-sm font-medium">Rate %</label>
          <input id="ratePercent" name="ratePercent" type="number" step="0.01" min="0" max="100" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clawbackWindowDays" className="text-foreground/80 text-sm font-medium">Clawback window (days)</label>
          <input id="clawbackWindowDays" name="clawbackWindowDays" type="number" min="0" className={inputClass} />
        </div>
      </div>
      {state.error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
      <button type="submit" disabled={isPending} className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
        {isPending ? "Saving…" : "Draft Commission Policy"}
      </button>
    </form>
  );
}
