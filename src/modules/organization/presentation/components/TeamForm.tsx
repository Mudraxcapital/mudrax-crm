"use client";

// ============================================================================
// src/modules/organization/presentation/components/TeamForm.tsx
//
// Shared create/edit form for the Team aggregate. Bind the target Server
// Action (createTeamAction, or updateTeamAction pre-bound to an id) before
// passing it in. `branches` is the Branch option list to populate the
// optional Branch-scope select (fetched by the page, since Team has no
// authority to list Branches itself).
// ============================================================================

import { useActionState } from "react";
import type { BranchDto } from "../../application/dto/BranchDto";
import type { TeamDto } from "../../application/dto/TeamDto";
import type { TeamFormState } from "../controllers/createTeam.action";

const initialState: TeamFormState = {};

type TeamFormAction = (
  state: TeamFormState | undefined,
  formData: FormData,
) => Promise<TeamFormState>;

export function TeamForm({
  action,
  team,
  branches,
  submitLabel,
}: {
  action: TeamFormAction;
  team?: TeamDto;
  branches: BranchDto[];
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
          defaultValue={team?.name}
          placeholder="Mumbai Sales Team"
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
          defaultValue={team?.code}
          placeholder="MUM-SALES"
          className="rounded-lg border border-border bg-transparent px-3.5 py-2.5 font-mono text-sm uppercase transition-colors outline-none focus:border-black/30 dark:focus:border-white/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="branchId" className="mx-label">
          Branch
        </label>
        <select
          id="branchId"
          name="branchId"
          defaultValue={team?.branchId ?? ""}
          className="mx-input"
        >
          <option value="">— No Branch —</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name} ({branch.code})
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isArchived"
          defaultChecked={team?.isArchived ?? false}
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
