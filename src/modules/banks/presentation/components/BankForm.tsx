"use client";

import { useActionState } from "react";
import { BANK_STATUSES } from "../../domain/entities/Bank";
import type { BanksFormState } from "../controllers/banksFormState";

const initialState: BanksFormState = {};
const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

type FormAction = (
  state: BanksFormState | undefined,
  formData: FormData,
) => Promise<BanksFormState>;

export function BankForm({
  action,
  defaults,
  submitLabel = "Create Bank",
}: {
  action: FormAction;
  defaults?: { name?: string; code?: string; status?: string };
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground/80 text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          defaultValue={defaults?.name}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-foreground/80 text-sm font-medium">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          maxLength={50}
          defaultValue={defaults?.code}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-foreground/80 text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaults?.status ?? "ONBOARDED"}
          className={inputClass}
        >
          {BANK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
