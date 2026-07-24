"use client";

// ============================================================================
// src/modules/documents/presentation/components/DocumentMetadataForm.tsx
// ============================================================================

import { useActionState } from "react";
import type { DocumentsFormState } from "../controllers/documentsFormState";

const initialState: DocumentsFormState = {};

type DocumentMetadataFormAction = (
  state: DocumentsFormState | undefined,
  formData: FormData,
) => Promise<DocumentsFormState>;

const inputClass = "mx-input";

export function DocumentMetadataForm({
  action,
  documentTypes,
  currentDocumentTypeId,
}: {
  action: DocumentMetadataFormAction;
  documentTypes: { id: string; label: string }[];
  currentDocumentTypeId: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="mx-label">Document Type</label>
        <select
          name="documentTypeId"
          required
          defaultValue={currentDocumentTypeId}
          className={inputClass}
        >
          {documentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
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
        {isPending ? "Saving…" : "Update Metadata"}
      </button>
    </form>
  );
}
