import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listSavedReports } from "@/modules/reports";
import { deleteSavedReportAction } from "@/modules/reports/presentation/controllers/deleteSavedReport.action";
import { rerunSavedReportAction } from "@/modules/reports/presentation/controllers/rerunSavedReport.action";
import { SavedReportsClient } from "./SavedReportsClient";

export default async function SavedReportsPage() {
  const { session } = await requirePermission("report.manage");
  const savedReports = await listSavedReports(session.user.id);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/reports" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Analytics Dashboard
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Saved Reports</h1>
        <p className="text-muted mt-1 text-sm">
          Re-run or delete previously saved report configurations.
        </p>
      </div>
      <SavedReportsClient
        savedReports={savedReports}
        rerunAction={rerunSavedReportAction}
        deleteAction={deleteSavedReportAction}
      />
    </div>
  );
}
