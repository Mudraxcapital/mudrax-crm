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

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

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
        <label className="text-foreground/80 text-sm font-medium">Name</label>
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
        <label className="text-foreground/80 text-sm font-medium">Category</label>
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
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : documentType ? "Save" : "Add Type"}
      </button>
    </form>
  );
}
