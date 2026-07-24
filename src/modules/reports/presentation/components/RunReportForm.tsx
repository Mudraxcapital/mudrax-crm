"use client";

import { useActionState } from "react";
import type { ReportsFormState } from "../controllers/reportsFormState";
import { ReportFilterFields } from "./ReportFilterFields";

const initialState: ReportsFormState = {};

type FormAction = (
  state: ReportsFormState | undefined,
  formData: FormData,
) => Promise<ReportsFormState>;

const inputClass = "mx-input";

export function RunReportForm({
  action,
  reportType,
  reportLabel,
  saveAction,
  canSave,
}: {
  action: FormAction;
  reportType: string;
  reportLabel: string;
  saveAction?: FormAction;
  canSave?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [saveState, saveFormAction, isSavePending] = useActionState(
    saveAction ?? action,
    initialState,
  );

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="reportType" value={reportType} />
        <p className="text-sm font-medium">{reportLabel}</p>
        <ReportFilterFields />
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {isPending ? "Running…" : "Run report"}
        </button>
      </form>

      {canSave && saveAction ? (
        <form
          action={saveFormAction}
          className="flex flex-col gap-5 border-t border-border pt-6"
        >
          <input type="hidden" name="reportType" value={reportType} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="mx-label">
              Save as
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder={`${reportLabel} — my view`}
              className={inputClass}
            />
          </div>
          <ReportFilterFields />
          {saveState.error ? <p className="text-sm text-red-600">{saveState.error}</p> : null}
          {saveState.success ? (
            <p className="text-sm text-green-700">{saveState.success}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSavePending}
            className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium disabled:opacity-60 dark:border-white/20"
          >
            {isSavePending ? "Saving…" : "Save report configuration"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
