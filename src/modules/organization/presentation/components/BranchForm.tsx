"use client";

// ============================================================================
// src/modules/organization/presentation/components/BranchForm.tsx
//
// Shared create/edit form for the Branch aggregate. Bind the target Server
// Action (createBranchAction, or updateBranchAction pre-bound to an id)
// before passing it in — this component has no knowledge of which mutation
// it triggers.
// ============================================================================

import { useActionState } from "react";
import type { BranchDto } from "../../application/dto/BranchDto";
import type { BranchFormState } from "../controllers/createBranch.action";

const initialState: BranchFormState = {};

type BranchFormAction = (
  state: BranchFormState | undefined,
  formData: FormData,
) => Promise<BranchFormState>;

export function BranchForm({
  action,
  branch,
  submitLabel,
}: {
  action: BranchFormAction;
  branch?: BranchDto;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground/80 text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={150}
          defaultValue={branch?.name}
          placeholder="Mumbai Head Office"
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-foreground/80 text-sm font-medium">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          maxLength={50}
          defaultValue={branch?.code}
          placeholder="MUM-HO"
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 font-mono text-sm uppercase transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-foreground/80 text-sm font-medium">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          maxLength={2000}
          defaultValue={branch?.address ?? ""}
          placeholder="Bandra Kurla Complex, Mumbai, Maharashtra 400051"
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="timezone" className="text-foreground/80 text-sm font-medium">
          Timezone
        </label>
        <input
          id="timezone"
          name="timezone"
          type="text"
          maxLength={64}
          defaultValue={branch?.timezone ?? "Asia/Kolkata"}
          placeholder="Asia/Kolkata"
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isArchived"
          defaultChecked={branch?.isArchived ?? false}
          className="h-4 w-4 rounded border-black/20 dark:border-white/25"
        />
        Archived
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background mt-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
