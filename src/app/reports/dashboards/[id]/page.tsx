import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getAnalyticsDashboard, getDashboard } from "@/modules/reports";
import { publishDashboardAction } from "@/modules/reports/presentation/controllers/publishDashboard.action";
import { PublishDashboardButton } from "./PublishDashboardButton";

export default async function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authContext } = await requirePermission("report.view");
  const canPublish = hasPermission(authContext, "dashboard.manage");
  const [dashboard, kpis] = await Promise.all([
    getDashboard(authContext.organizationId, id),
    getAnalyticsDashboard(authContext.organizationId),
  ]);

  const kpiValues: Record<string, number> = {
    "Total Customers": kpis.totalCustomers,
    "Total Leads": kpis.totalLeads,
    "Calls Today": kpis.callsToday,
    "Connected Calls": kpis.connectedCalls,
    "Missed Calls": kpis.missedCalls,
    "Documents Uploaded": kpis.documentsUploaded,
    "Pending Document Verification": kpis.pendingDocumentVerification,
    "Notifications Sent": kpis.notificationsSent,
    "Failed Notifications": kpis.failedNotifications,
  };

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/reports/dashboards" className="text-sm text-accent hover:underline underline-offset-4">
        ← Dashboards
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{dashboard.name}</h1>
          <p className="text-muted mt-1 text-sm">
            {dashboard.audience} · {dashboard.status}
          </p>
        </div>
        {canPublish && dashboard.status !== "PUBLISHED" ? (
          <PublishDashboardButton action={publishDashboardAction} dashboardId={dashboard.id} />
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {dashboard.widgets.length === 0 ? (
          <p className="text-muted text-sm">No widgets configured.</p>
        ) : (
          dashboard.widgets.map((widget) => {
            const label = widget.kpiKey ?? widget.visualizationType;
            const value = widget.kpiKey ? (kpiValues[widget.kpiKey] ?? "—") : "—";
            return (
              <div
                key={widget.id}
                className="mx-card p-5"
              >
                <p className="text-muted text-xs font-medium tracking-wide uppercase">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
