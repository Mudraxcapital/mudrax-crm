"use client";

import { useActionState } from "react";
import {
  mergeCustomersAction,
  type DuplicateFormState,
} from "../controllers/duplicate.actions";

const initial: DuplicateFormState = {};

export function MergeCustomersForm({
  survivingCustomerId,
  mergedAwayCustomerId,
  duplicateCandidateId,
}: {
  survivingCustomerId?: string;
  mergedAwayCustomerId?: string;
  duplicateCandidateId?: string;
}) {
  const [state, action, pending] = useActionState(mergeCustomersAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      {duplicateCandidateId ? (
        <input type="hidden" name="duplicateCandidateId" value={duplicateCandidateId} />
      ) : null}
      <label className="text-sm">
        Surviving Customer ID
        <input
          name="survivingCustomerId"
          required
          defaultValue={survivingCustomerId}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
        />
      </label>
      <label className="text-sm">
        Merged-away Customer ID
        <input
          name="mergedAwayCustomerId"
          required
          defaultValue={mergedAwayCustomerId}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
        />
      </label>
      <label className="text-sm">
        Reason
        <textarea
          name="reason"
          rows={2}
          className="mt-1 w-full mx-input"
        />
      </label>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mx-btn mx-btn-secondary"
      >
        {pending ? "Merging…" : "Merge Customers"}
      </button>
    </form>
  );
}
