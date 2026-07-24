"use client";

// ============================================================================
// src/modules/documents/presentation/components/DocumentTypeForm.tsx
// ============================================================================

import { useActionState } from "react";
import type { DocumentTypeDto } from "../../application/dto/DocumentTypeDto";
import type { DocumentsFormState } from "../controllers/documentsFormState";

const initialState: DocumentsFormState = {};

type DocumentTypeFormAction = (
  state: DocumentsFormState | undefined,
  formData: FormData,
) => Promise<DocumentsFormState>;

const inputClass = "mx-input";

export function DocumentTypeForm({
  action,
  documentType,
  categories,
}: {
  action: DocumentTypeFormAction;
  documentType?: DocumentTypeDto;
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="mx-label">Name</label>
        <input
          name="name"
          type="text"
          required
          maxLength={150}
          defaultValue={documentType?.name}
          placeholder="e.g. PAN Card"
          className={inputClass}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="mx-label">Category</label>
        <select
          name="documentCategoryId"
          required
          defaultValue={documentType?.documentCategoryId ?? categories[0]?.id}
          className={inputClass}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      {documentType ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={documentType.isActive} />
          Active
        </label>
      ) : null}

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
        {isPending ? "Saving…" : documentType ? "Save" : "Add Type"}
      </button>
    </form>
  );
}
