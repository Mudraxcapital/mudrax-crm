"use client";

// ============================================================================
// src/modules/documents/presentation/components/DocumentCategoryForm.tsx
// ============================================================================

import { useActionState } from "react";
import type { DocumentCategoryDto } from "../../application/dto/DocumentCategoryDto";
import type { DocumentsFormState } from "../controllers/documentsFormState";

const initialState: DocumentsFormState = {};

type DocumentCategoryFormAction = (
  state: DocumentsFormState | undefined,
  formData: FormData,
) => Promise<DocumentsFormState>;

const inputClass = "mx-input";

export function DocumentCategoryForm({
  action,
  category,
}: {
  action: DocumentCategoryFormAction;
  category?: DocumentCategoryDto;
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
          maxLength={100}
          defaultValue={category?.name}
          placeholder="e.g. KYC"
          className={inputClass}
        />
      </div>
      {category ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={category.isActive} />
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
        {isPending ? "Saving…" : category ? "Save" : "Add Category"}
      </button>
    </form>
  );
}
