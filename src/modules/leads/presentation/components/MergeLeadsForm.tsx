"use client";

import { useActionState } from "react";
import { mergeLeadsAction, type ProductivityFormState } from "../controllers/productivity.actions";

const initial: ProductivityFormState = {};

export function MergeLeadsForm({
  defaultSurvivingId,
  lostReasons,
}: {
  defaultSurvivingId?: string;
  lostReasons: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(mergeLeadsAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="text-sm">
        Surviving Lead ID
        <input
          name="survivingLeadId"
          required
          defaultValue={defaultSurvivingId}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
        />
      </label>
      <label className="text-sm">
        Merged-away Lead ID
        <input
          name="mergedAwayLeadId"
          required
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
        />
      </label>
      <label className="text-sm">
        Lost Reason
        <select
          name="lostReasonId"
          className="mt-1 w-full mx-input"
          defaultValue={lostReasons.find((r) => r.name.toLowerCase().includes("duplicate"))?.id}
        >
          {lostReasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.name}
            </option>
          ))}
        </select>
      </label>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mx-btn mx-btn-secondary"
      >
        {pending ? "Merging…" : "Merge Leads"}
      </button>
    </form>
  );
}
