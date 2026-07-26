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
  customers = [],
  survivingLabel,
  mergedAwayLabel,
}: {
  survivingCustomerId?: string;
  mergedAwayCustomerId?: string;
  duplicateCandidateId?: string;
  /** Name pickers for customers (values remain internal IDs). */
  customers?: { id: string; fullName: string }[];
  survivingLabel?: string;
  mergedAwayLabel?: string;
}) {
  const [state, action, pending] = useActionState(mergeCustomersAction, initial);
  const lockSurviving = Boolean(survivingCustomerId && survivingLabel);
  const lockMergedAway = Boolean(mergedAwayCustomerId && mergedAwayLabel && customers.length === 0);

  return (
    <form action={action} className="flex flex-col gap-3">
      {duplicateCandidateId ? (
        <input type="hidden" name="duplicateCandidateId" value={duplicateCandidateId} />
      ) : null}
      <label className="text-sm">
        Surviving customer
        {lockSurviving ? (
          <>
            <input type="hidden" name="survivingCustomerId" value={survivingCustomerId} />
            <p className="mt-1 font-medium">{survivingLabel}</p>
          </>
        ) : customers.length > 0 ? (
          <select
            name="survivingCustomerId"
            required
            defaultValue={survivingCustomerId}
            className="mt-1 w-full mx-input"
          >
            <option value="">Select customer…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName}
              </option>
            ))}
          </select>
        ) : (
          <input
            name="survivingCustomerId"
            required
            defaultValue={survivingCustomerId}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Customer"
          />
        )}
      </label>
      <label className="text-sm">
        Customer to merge away
        {lockMergedAway ? (
          <>
            <input type="hidden" name="mergedAwayCustomerId" value={mergedAwayCustomerId} />
            <p className="mt-1 font-medium">{mergedAwayLabel}</p>
          </>
        ) : customers.length > 0 ? (
          <select
            name="mergedAwayCustomerId"
            required
            defaultValue={mergedAwayCustomerId}
            className="mt-1 w-full mx-input"
          >
            <option value="">Select customer…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName}
              </option>
            ))}
          </select>
        ) : (
          <input
            name="mergedAwayCustomerId"
            required
            defaultValue={mergedAwayCustomerId}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Duplicate customer"
          />
        )}
      </label>
      <label className="text-sm">
        Reason
        <textarea name="reason" rows={2} className="mt-1 w-full mx-input" />
      </label>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
      <button type="submit" disabled={pending} className="mx-btn mx-btn-secondary">
        {pending ? "Merging…" : "Merge Customers"}
      </button>
    </form>
  );
}
