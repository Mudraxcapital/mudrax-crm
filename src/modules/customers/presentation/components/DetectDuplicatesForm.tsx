"use client";

import { useActionState } from "react";
import {
  detectDuplicatesAction,
  type DuplicateFormState,
} from "../controllers/duplicate.actions";

const initial: DuplicateFormState = {};

export function DetectDuplicatesForm() {
  const [state, action, pending] = useActionState(detectDuplicatesAction, initial);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Running…" : "Run detection"}
      </button>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-muted text-xs">{state.success}</p> : null}
    </form>
  );
}
