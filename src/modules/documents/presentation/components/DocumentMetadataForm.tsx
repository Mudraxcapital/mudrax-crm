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

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

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
        <label className="text-foreground/80 text-sm font-medium">Document Type</label>
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
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Update Metadata"}
      </button>
    </form>
  );
}
