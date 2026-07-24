import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { REPORT_TYPE_LABELS, type ReportType } from "@/modules/reports";
import { RunReportForm } from "@/modules/reports/presentation/components/RunReportForm";
import { runReportAction } from "@/modules/reports/presentation/controllers/runReport.action";
import { saveReportAction } from "@/modules/reports/presentation/controllers/saveReport.action";

export async function ReportTypePage({ reportType }: { reportType: ReportType }) {
  const { authContext } = await requirePermission("report.view");
  const canSave = hasPermission(authContext, "report.manage");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <Link href="/reports" className="text-sm underline underline-offset-4">
        ← Analytics Dashboard
      </Link>
      <div>
        <h1 className="text-lg font-semibold">{REPORT_TYPE_LABELS[reportType]}</h1>
        <p className="text-muted mt-1 text-sm">
          Filter by date range, branch, department, team, or user, then run or save.
        </p>
      </div>
      <RunReportForm
        action={runReportAction}
        reportType={reportType}
        reportLabel={REPORT_TYPE_LABELS[reportType]}
        saveAction={saveReportAction}
        canSave={canSave}
      />
    </div>
  );
}
