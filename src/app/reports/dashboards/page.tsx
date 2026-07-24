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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/reports" className="text-sm underline underline-offset-4">
        ← Analytics Dashboard
      </Link>
      <div>
        <h1 className="text-lg font-semibold">Dashboard Framework</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Create and publish dashboards that bind widgets to KPIs (layout only — values resolve live).
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <ul className="flex flex-col">
          {dashboards.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No dashboards yet.</li>
          ) : (
            dashboards.map((dashboard) => (
              <li
                key={dashboard.id}
                className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <Link
                  href={`/reports/dashboards/${dashboard.id}`}
                  className="underline underline-offset-4"
                >
                  {dashboard.name}
                </Link>
                <span className="text-foreground/60">
                  {dashboard.audience} · {dashboard.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {canCreate ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="mb-4 text-sm font-medium">Create dashboard</h2>
          <DashboardForm action={createDashboardAction} kpiNames={kpis.map((kpi) => kpi.name)} />
        </section>
      ) : null}
    </div>
  );
}
