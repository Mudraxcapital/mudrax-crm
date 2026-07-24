"use client";

// ============================================================================
// src/modules/documents/presentation/components/DocumentVerificationForm.tsx
// ============================================================================

import { useActionState } from "react";
import { MANUAL_VERIFICATION_STATUSES } from "../../domain/entities/DocumentVerification";
import type { DocumentsFormState } from "../controllers/documentsFormState";

const initialState: DocumentsFormState = {};

type DocumentVerificationFormAction = (
  state: DocumentsFormState | undefined,
  formData: FormData,
) => Promise<DocumentsFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function DocumentVerificationForm({
  action,
  currentStatus,
}: {
  action: DocumentVerificationFormAction;
  currentStatus: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground/80 text-sm font-medium">Status</label>
          <select name="status" required defaultValue={currentStatus} className={inputClass}>
            {MANUAL_VERIFICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-foreground/80 text-sm font-medium">Rejection reason</label>
          <input
            name="rejectionReason"
            type="text"
            maxLength={2000}
            placeholder="Required when rejecting"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-foreground text-background rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Update Verification"}
        </button>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
