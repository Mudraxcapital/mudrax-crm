"use client";

import { useActionState } from "react";
import type { ReportsFormState } from "../controllers/reportsFormState";

const initialState: ReportsFormState = {};

type FormAction = (
  state: ReportsFormState | undefined,
  formData: FormData,
) => Promise<ReportsFormState>;

const inputClass = "mx-input";

export function DashboardForm({
  action,
  kpiNames,
}: {
  action: FormAction;
  kpiNames: string[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="mx-label">
          Dashboard name
        </label>
        <input id="name" name="name" required className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="audience" className="mx-label">
          Audience
        </label>
        <select id="audience" name="audience" required className={inputClass} defaultValue="EXECUTIVE">
          <option value="EXECUTIVE">Executive</option>
          <option value="BRANCH">Branch</option>
          <option value="TEAM">Team</option>
          <option value="PERSONAL">Personal</option>
        </select>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mx-label">KPI widgets</legend>
        {kpiNames.map((name) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="kpiName" value={name} defaultChecked />
            <span>{name}</span>
          </label>
        ))}
      </fieldset>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {isPending ? "Creating…" : "Create dashboard"}
      </button>
    </form>
  );
}
