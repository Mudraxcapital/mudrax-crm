"use client";

// ============================================================================
// src/modules/follow-ups/presentation/components/FollowUpForm.tsx
//
// Create form for the Follow-up aggregate, scoped to a single Lead.
// `assignees` is the User option list to populate the optional assignee
// select (fetched by the page; defaults server-side to the Lead's current
// assignee when left blank).
// ============================================================================

import { useActionState } from "react";
import type { FollowUpFormState } from "../controllers/createFollowUp.action";

const initialState: FollowUpFormState = {};

type CreateFollowUpFormAction = (
  state: FollowUpFormState | undefined,
  formData: FormData,
) => Promise<FollowUpFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function FollowUpForm({
  action,
  assignees,
}: {
  action: CreateFollowUpFormAction;
  assignees: { id: string; fullName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="triggerType" className="text-foreground/80 text-sm font-medium">
            Type
          </label>
          <select
            id="triggerType"
            name="triggerType"
            required
            defaultValue="FOLLOW_UP"
            className={inputClass}
          >
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="CALL_LATER">Call Later</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="scheduledFor" className="text-foreground/80 text-sm font-medium">
            Scheduled for
          </label>
          <input
            id="scheduledFor"
            name="scheduledFor"
            type="datetime-local"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentAssigneeUserId" className="text-foreground/80 text-sm font-medium">
          Assign to (optional)
        </label>
        <select id="currentAssigneeUserId" name="currentAssigneeUserId" className={inputClass}>
          <option value="">— Same as Lead&apos;s assignee —</option>
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
        {isPending ? "Scheduling…" : "Schedule Follow-up"}
      </button>
    </form>
  );
}
