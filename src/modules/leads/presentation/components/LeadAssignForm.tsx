"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadAssignForm.tsx
//
// Inline Lead reassignment control (`lead.reassign`) on the Lead detail
// page.
// ============================================================================

import { useActionState } from "react";
import type { LeadFormState } from "../controllers/createLead.action";

const initialState: LeadFormState = {};

type AssignLeadFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function LeadAssignForm({
  action,
  currentAssigneeUserId,
  assignees,
}: {
  action: AssignLeadFormAction;
  currentAssigneeUserId: string | null;
  assignees: { id: string; fullName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="assignedToUserId" className="text-foreground/80 text-sm font-medium">
          Assignee
        </label>
        <select
          id="assignedToUserId"
          name="assignedToUserId"
          required
          defaultValue={currentAssigneeUserId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            — Select a User —
          </option>
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
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
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Assigning…" : "Assign Lead"}
      </button>
    </form>
  );
}
