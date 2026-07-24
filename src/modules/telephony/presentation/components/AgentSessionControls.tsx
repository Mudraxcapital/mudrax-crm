"use client";

// ============================================================================
// src/modules/telephony/presentation/components/AgentSessionControls.tsx
//
// The current Agent's own session controls: Login (when no Active session
// exists) or availability-status change + Logout (when one does).
// ============================================================================

import { useActionState } from "react";
import type { AgentSessionStatus } from "../../domain/entities/AgentSession";
import type { TelephonyFormState } from "../controllers/initiateClickToCall.action";

const initialState: TelephonyFormState = {};

type FormAction = (
  state: TelephonyFormState | undefined,
  formData: FormData,
) => Promise<TelephonyFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

const MANUAL_STATUSES: AgentSessionStatus[] = ["AVAILABLE", "IDLE", "BREAK", "BUSY"];

export function StartAgentSessionForm({ action }: { action: FormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="text-foreground/80 text-sm font-medium">Extension (optional)</label>
        <input
          name="extensionNumber"
          type="text"
          maxLength={20}
          placeholder="Auto-assigned if left blank"
          className={inputClass}
        />
      </div>
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
        {isPending ? "Logging in…" : "Log In"}
      </button>
    </form>
  );
}

export function ChangeAgentStatusForm({
  action,
  currentStatus,
}: {
  action: FormAction;
  currentStatus: AgentSessionStatus;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="text-foreground/80 text-sm font-medium">Availability</label>
        <select name="status" defaultValue={currentStatus} className={inputClass}>
          {MANUAL_STATUSES.map((status) => (
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
        className="bg-foreground text-background rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Update Status"}
      </button>
    </form>
  );
}

export function EndAgentSessionForm({ action }: { action: FormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 dark:border-white/15"
      >
        {isPending ? "Logging out…" : "Log Out"}
      </button>
    </form>
  );
}
