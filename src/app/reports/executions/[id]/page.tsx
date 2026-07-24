import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getReportExecution } from "@/modules/reports";
import { ExportReportControls } from "@/modules/reports/presentation/components/ExportReportControls";
import { exportReportAction } from "@/modules/reports/presentation/controllers/exportReport.action";

export default async function ReportExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authContext } = await requirePermission("report.view");
  const canExport = hasPermission(authContext, "export.create");
  const execution = await getReportExecution(authContext.organizationId, id, {
    includeResult: true,
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <Link href="/reports" className="text-sm underline underline-offset-4">
        ← Analytics Dashboard
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Report Execution</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          {execution.reportType ?? "Report"} · {execution.status}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <dt className="text-foreground/60">Trigger</dt>
        <dd>{execution.triggerType}</dd>
        <dt className="text-foreground/60">Started</dt>
        <dd>{execution.startedAt ? new Date(execution.startedAt).toLocaleString() : "—"}</dd>
        <dt className="text-foreground/60">Completed</dt>
        <dd>{execution.completedAt ? new Date(execution.completedAt).toLocaleString() : "—"}</dd>
      </dl>

      {canExport && execution.status === "COMPLETED" ? (
        <ExportReportControls action={exportReportAction} reportExecutionId={execution.id} />
      ) : null}

      {execution.result ? (
        <section className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-black/10 dark:border-white/15">
              <tr>
                {execution.result.columns.map((column) => (
                  <th key={column} className="px-3 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {execution.result.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={execution.result.columns.length}
                    className="text-foreground/60 px-3 py-6 text-center"
                  >
                    No rows matched the filter.
                  </td>
                </tr>
              ) : (
                execution.result.rows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-black/5 last:border-0 dark:border-white/10"
                  >
                    {execution.result!.columns.map((column) => (
                      <td key={column} className="px-3 py-2 whitespace-nowrap">
                        {row[column] === null || row[column] === undefined
                          ? "—"
                          : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
