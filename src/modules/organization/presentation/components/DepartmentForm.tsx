"use client";

// ============================================================================
// src/modules/organization/presentation/components/DepartmentForm.tsx
//
// Shared create/edit form for the Department aggregate. Bind the target
// Server Action (createDepartmentAction, or updateDepartmentAction
// pre-bound to an id) before passing it in.
// ============================================================================

import { useActionState } from "react";
import type { DepartmentDto } from "../../application/dto/DepartmentDto";
import type { DepartmentFormState } from "../controllers/createDepartment.action";

const initialState: DepartmentFormState = {};

type DepartmentFormAction = (
  state: DepartmentFormState | undefined,
  formData: FormData,
) => Promise<DepartmentFormState>;

export function DepartmentForm({
  action,
  department,
  submitLabel,
}: {
  action: DepartmentFormAction;
  department?: DepartmentDto;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="mx-label">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={150}
          defaultValue={department?.name}
          placeholder="Sales"
          className="mx-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="mx-label">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          maxLength={50}
          defaultValue={department?.code}
          placeholder="SALES"
          className="rounded-lg border border-border bg-transparent px-3.5 py-2.5 font-mono text-sm uppercase transition-colors outline-none focus:border-black/30 dark:focus:border-white/40"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isArchived"
          defaultChecked={department?.isArchived ?? false}
          className="h-4 w-4 rounded border-black/20 dark:border-white/25"
        />
        Archived
      </label>

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mx-btn mx-btn-primary mt-1"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
