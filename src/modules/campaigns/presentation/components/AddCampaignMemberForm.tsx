"use client";

// ============================================================================
// src/modules/campaigns/presentation/components/AddCampaignMemberForm.tsx
//
// Inline control to add a User as a Campaign member.
// ============================================================================

import { useActionState } from "react";
import type { CampaignFormState } from "../controllers/createCampaign.action";

const initialState: CampaignFormState = {};

type AddMemberFormAction = (
  state: CampaignFormState | undefined,
  formData: FormData,
) => Promise<CampaignFormState>;

const inputClass = "mx-input";

export function AddCampaignMemberForm({
  action,
  candidates,
}: {
  action: AddMemberFormAction;
  candidates: { id: string; fullName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="userId" className="mx-label">
          User
        </label>
        <select id="userId" name="userId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            — Select a User —
          </option>
          {candidates.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="allocationWeight" className="mx-label">
          Weight
        </label>
        <input
          id="allocationWeight"
          name="allocationWeight"
          type="number"
          min={0.01}
          step={0.01}
          defaultValue={1}
          className={`${inputClass} w-24`}
        />
      </div>

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add Member"}
      </button>
    </form>
  );
}
