"use client";

import { useActionState } from "react";
import type { SavedReportDto } from "@/modules/reports";
import type { ReportsFormState } from "@/modules/reports/presentation/controllers/reportsFormState";

const initialState: ReportsFormState = {};

type FormAction = (
  state: ReportsFormState | undefined,
  formData: FormData,
) => Promise<ReportsFormState>;

export function SavedReportsClient({
  savedReports,
  rerunAction,
  deleteAction,
}: {
  savedReports: SavedReportDto[];
  rerunAction: FormAction;
  deleteAction: FormAction;
}) {
  const [rerunState, rerunFormAction, isRerunning] = useActionState(rerunAction, initialState);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(deleteAction, initialState);

  if (savedReports.length === 0) {
    return <p className="text-foreground/60 text-sm">No saved reports yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {rerunState.error ? <p className="text-sm text-red-600">{rerunState.error}</p> : null}
      {deleteState.error ? <p className="text-sm text-red-600">{deleteState.error}</p> : null}
      {deleteState.success ? (
        <p className="text-sm text-green-700">{deleteState.success}</p>
      ) : null}
      <ul className="rounded-xl border border-black/10 dark:border-white/15">
        {savedReports.map((report) => (
          <li
            key={report.id}
            className="flex flex-col gap-3 border-b border-black/5 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
          >
            <div>
              <p className="text-sm font-medium">{report.name}</p>
              <p className="text-foreground/60 text-xs">
                {report.reportType ?? "—"} · {report.templateName ?? "Template"}
              </p>
            </div>
            <div className="flex gap-2">
              <form action={rerunFormAction}>
                <input type="hidden" name="savedReportId" value={report.id} />
                <button
                  type="submit"
                  disabled={isRerunning}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-xs disabled:opacity-60 dark:border-white/20"
                >
                  Re-run
                </button>
              </form>
              <form action={deleteFormAction}>
                <input type="hidden" name="savedReportId" value={report.id} />
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:opacity-60 dark:border-red-800 dark:text-red-300"
                >
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
