"use client";

// ============================================================================
// src/modules/documents/presentation/components/DocumentVersionForm.tsx
// ============================================================================

import { useActionState } from "react";
import type { DocumentsFormState } from "../controllers/documentsFormState";

const initialState: DocumentsFormState = {};

type DocumentVersionFormAction = (
  state: DocumentsFormState | undefined,
  formData: FormData,
) => Promise<DocumentsFormState>;

const inputClass = "mx-input";

export function DocumentVersionForm({ action }: { action: DocumentVersionFormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="mx-label">New version file</label>
        <input name="file" type="file" required className={inputClass} />
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
        {isPending ? "Uploading…" : "Upload New Version"}
      </button>
    </form>
  );
}
