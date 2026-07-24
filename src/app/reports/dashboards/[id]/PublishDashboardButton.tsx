"use client";

import { useActionState } from "react";
import type { ReportsFormState } from "@/modules/reports/presentation/controllers/reportsFormState";

const initialState: ReportsFormState = {};

type FormAction = (
  state: ReportsFormState | undefined,
  formData: FormData,
) => Promise<ReportsFormState>;

export function PublishDashboardButton({
  action,
  dashboardId,
}: {
  action: FormAction;
  dashboardId: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="dashboardId" value={dashboardId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {isPending ? "Publishing…" : "Publish"}
      </button>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-green-700">{state.success}</p> : null}
    </form>
  );
}
