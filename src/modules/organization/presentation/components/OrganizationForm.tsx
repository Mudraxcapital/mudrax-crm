"use client";

// ============================================================================
// src/modules/organization/presentation/components/OrganizationForm.tsx
//
// Shared create/edit form for the Organization aggregate. Bind the target
// Server Action (createOrganizationAction, or updateOrganizationAction
// pre-bound to an id) before passing it in — this component has no
// knowledge of which mutation it triggers.
// ============================================================================

import { useActionState } from "react";
import type { OrganizationDto } from "../../application/dto/OrganizationDto";
import type { OrganizationFormState } from "../controllers/createOrganization.action";

const initialState: OrganizationFormState = {};

type OrganizationFormAction = (
  state: OrganizationFormState | undefined,
  formData: FormData,
) => Promise<OrganizationFormState>;

export function OrganizationForm({
  action,
  organization,
  submitLabel,
}: {
  action: OrganizationFormAction;
  organization?: OrganizationDto;
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
          maxLength={200}
          defaultValue={organization?.name}
          placeholder="Mudrax Capitals"
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
          defaultValue={organization?.code}
          placeholder="MUDRAX"
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 font-mono text-sm uppercase transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
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
          defaultValue={organization?.timezone ?? "Asia/Kolkata"}
          placeholder="Asia/Kolkata"
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-foreground/80 text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={organization?.status ?? "ACTIVE"}
          className="rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        >
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
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
        className="bg-foreground text-background mt-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
