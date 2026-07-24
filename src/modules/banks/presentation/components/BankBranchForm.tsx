"use client";

import { useActionState } from "react";
import type { BanksFormState } from "../controllers/banksFormState";

const initialState: BanksFormState = {};
const inputClass = "mx-input";

type FormAction = (
  state: BanksFormState | undefined,
  formData: FormData,
) => Promise<BanksFormState>;

export function BankBranchForm({ action }: { action: FormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="branch-name" className="mx-label">
            Branch name
          </label>
          <input id="branch-name" name="name" required maxLength={200} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="branch-code" className="mx-label">
            Branch code
          </label>
          <input id="branch-code" name="code" required maxLength={50} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="mx-label">
          Address (optional)
        </label>
        <input id="address" name="address" maxLength={4000} className={inputClass} />
      </div>
      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Add Bank Branch"}
      </button>
    </form>
  );
}
