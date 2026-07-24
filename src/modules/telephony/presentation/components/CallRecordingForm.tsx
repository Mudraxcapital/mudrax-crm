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

const inputClass = "mx-input";

export function CallRecordingForm({ action }: { action: CallRecordingFormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="mx-label">Storage reference</label>
        <input
          name="storageReference"
          type="text"
          required
          placeholder="s3://recordings/call-123.wav"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="mx-label">Duration (seconds)</label>
        <input name="durationSeconds" type="number" min={0} className={`${inputClass} w-32`} />
      </div>

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mx-btn mx-btn-primary"
      >
        {isPending ? "Saving…" : "Log Recording"}
      </button>
    </form>
  );
}
