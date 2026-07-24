"use client";

// ============================================================================
// src/modules/telephony/presentation/components/CallRecordingForm.tsx
//
// Logs Recording Metadata for a Call Attempt: file/storage reference and
// duration only (docs/modules/telephony.md — "Recording metadata should
// store file reference, duration, timestamps and provider metadata only").
// ============================================================================

import { useActionState } from "react";
import type { TelephonyFormState } from "../controllers/initiateClickToCall.action";

const initialState: TelephonyFormState = {};

type CallRecordingFormAction = (
  state: TelephonyFormState | undefined,
  formData: FormData,
) => Promise<TelephonyFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function CallRecordingForm({ action }: { action: CallRecordingFormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="text-foreground/80 text-sm font-medium">Storage reference</label>
        <input
          name="storageReference"
          type="text"
          required
          placeholder="s3://recordings/call-123.wav"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-foreground/80 text-sm font-medium">Duration (seconds)</label>
        <input name="durationSeconds" type="number" min={0} className={`${inputClass} w-32`} />
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
        {isPending ? "Saving…" : "Log Recording"}
      </button>
    </form>
  );
}
