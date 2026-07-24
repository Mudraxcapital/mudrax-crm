"use client";

import { useActionState } from "react";
import { importLeadsCsvAction, type ProductivityFormState } from "../controllers/productivity.actions";

const initial: ProductivityFormState = {};

export function LeadImportForm({
  sources,
}: {
  sources: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(importLeadsCsvAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="text-sm">
        Lead Source
        <select
          name="leadSourceId"
          required
          className="mt-1 w-full mx-input"
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        CSV file name
        <input
          name="sourceFileName"
          defaultValue="leads.csv"
          className="mt-1 w-full mx-input"
        />
      </label>
      <label className="text-sm">
        CSV content
        <textarea
          name="csvText"
          required
          rows={10}
          placeholder={"fullName,phone,email\nRahul Sharma,+919876543210,rahul@example.com"}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
        />
      </label>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mx-btn mx-btn-secondary"
      >
        {pending ? "Importing…" : "Import CSV"}
      </button>
    </form>
  );
}
