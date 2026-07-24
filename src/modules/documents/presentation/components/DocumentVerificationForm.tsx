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

const inputClass = "mx-input";

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
          <label className="mx-label">Status</label>
          <select name="status" required defaultValue={currentStatus} className={inputClass}>
            {MANUAL_VERIFICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="mx-label">Rejection reason</label>
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
          className="mx-btn mx-btn-primary"
        >
          {isPending ? "Saving…" : "Update Verification"}
        </button>
      </div>

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
