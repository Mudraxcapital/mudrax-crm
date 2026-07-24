"use client";

import { useActionState } from "react";
import type { ReportsFormState } from "../controllers/reportsFormState";

const initialState: ReportsFormState = {};

type FormAction = (
  state: ReportsFormState | undefined,
  formData: FormData,
) => Promise<ReportsFormState>;

export function ExportReportControls({
  action,
  reportExecutionId,
}: {
  action: FormAction;
  reportExecutionId: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <form action={formAction}>
          <input type="hidden" name="reportExecutionId" value={reportExecutionId} />
          <input type="hidden" name="format" value="CSV" />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm disabled:opacity-60 dark:border-white/20"
          >
            Export CSV
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="reportExecutionId" value={reportExecutionId} />
          <input type="hidden" name="format" value="PDF" />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm disabled:opacity-60 dark:border-white/20"
          >
            Export PDF
          </button>
        </form>
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success && state.downloadPath ? (
        <p className="text-sm">
          {state.success}{" "}
          <a href={state.downloadPath} className="underline underline-offset-4">
            Download
          </a>
        </p>
      ) : null}
    </div>
  );
}
