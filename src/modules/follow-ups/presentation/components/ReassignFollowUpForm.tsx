"use client";

// ============================================================================
// src/modules/follow-ups/presentation/components/ReassignFollowUpForm.tsx
// ============================================================================

import { useActionState } from "react";
import type { FollowUpFormState } from "../controllers/createFollowUp.action";

const initialState: FollowUpFormState = {};

type ReassignFollowUpFormAction = (
  state: FollowUpFormState | undefined,
  formData: FormData,
) => Promise<FollowUpFormState>;

const inputClass = "mx-input";

export function ReassignFollowUpForm({
  action,
  assignees,
}: {
  action: ReassignFollowUpFormAction;
  assignees: { id: string; fullName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <select id="toUserId" name="toUserId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          — Select a User —
        </option>
        {assignees.map((user) => (
          <option key={user.id} value={user.id}>
            {user.fullName}
          </option>
        ))}
      </select>

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Reassigning…" : "Reassign"}
      </button>
    </form>
  );
}
