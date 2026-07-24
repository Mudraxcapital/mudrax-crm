import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listDashboards, listKpis } from "@/modules/reports";
import { DashboardForm } from "@/modules/reports/presentation/components/DashboardForm";
import { createDashboardAction } from "@/modules/reports/presentation/controllers/createDashboard.action";

export default async function DashboardsPage() {
  const { authContext } = await requirePermission("dashboard.manage");
  const canCreate = hasPermission(authContext, "dashboard.manage");
  const [dashboards, kpis] = await Promise.all([
    listDashboards(authContext.organizationId),
    listKpis(authContext.organizationId),
  ]);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/reports" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Analytics Dashboard
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard Framework</h1>
        <p className="text-muted mt-1 text-sm">
          Create and publish dashboards that bind widgets to KPIs (layout only — values resolve live).
        </p>
      </div>

      <section className="mx-card overflow-hidden">
        <ul className="flex flex-col">
          {dashboards.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">No dashboards yet.</li>
          ) : (
            dashboards.map((dashboard) => (
              <li
                key={dashboard.id}
                className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-0 "
              >
                <Link
                  href={`/reports/dashboards/${dashboard.id}`}
                  className="text-accent hover:text-accent hover:underline underline-offset-4"
                >
                  {dashboard.name}
                </Link>
                <span className="text-muted">
                  {dashboard.audience} · {dashboard.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {canCreate ? (
        <section className="mx-card p-5">
          <h2 className="mb-4 text-sm font-medium">Create dashboard</h2>
          <DashboardForm action={createDashboardAction} kpiNames={kpis.map((kpi) => kpi.name)} />
        </section>
      ) : null}
    </div>
  );
}
