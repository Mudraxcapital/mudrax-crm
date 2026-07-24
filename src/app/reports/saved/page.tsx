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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/reports" className="text-sm underline underline-offset-4">
        ← Analytics Dashboard
      </Link>
      <div>
        <h1 className="text-lg font-semibold">Saved Reports</h1>
        <p className="text-foreground/60 mt-1 text-sm">
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
