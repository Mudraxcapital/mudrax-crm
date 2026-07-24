import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getAnalyticsDashboard, REPORT_TYPE_LABELS } from "@/modules/reports";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
      <p className="text-foreground/60 text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Breakdown({
  title,
  entries,
}: {
  title: string;
  entries: { key: string; label: string; count: number }[];
}) {
  return (
    <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {entries.length === 0 ? (
          <li className="text-foreground/60">No data yet.</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.key} className="flex items-center justify-between">
              <span>{entry.label}</span>
              <span className="font-medium">{entry.count}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export default async function AnalyticsDashboardPage() {
  const { authContext } = await requirePermission("report.view");
  const canManage = hasPermission(authContext, "report.manage");
  const canManageDashboards = hasPermission(authContext, "dashboard.manage");

  const dashboard = await getAnalyticsDashboard(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Live KPIs across Customers, Leads, Campaigns, Telephony, Documents, and Notifications.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Customers" value={dashboard.totalCustomers} />
        <StatCard label="Total Leads" value={dashboard.totalLeads} />
        <StatCard label="Calls Today" value={dashboard.callsToday} />
        <StatCard label="Connected Calls" value={dashboard.connectedCalls} />
        <StatCard label="Missed Calls" value={dashboard.missedCalls} />
        <StatCard label="Documents Uploaded" value={dashboard.documentsUploaded} />
        <StatCard label="Pending Verification" value={dashboard.pendingDocumentVerification} />
        <StatCard label="Notifications Sent" value={dashboard.notificationsSent} />
        <StatCard label="Failed Notifications" value={dashboard.failedNotifications} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Breakdown title="Leads by Status" entries={dashboard.leadsByStatus} />
        <Breakdown title="Leads by Source" entries={dashboard.leadsBySource} />
        <Breakdown title="Campaign Performance" entries={dashboard.campaignPerformance} />
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Reports</h2>
        <ul className="mt-4 flex flex-wrap gap-4 text-sm">
          {(
            [
              ["CUSTOMER", "/reports/customers"],
              ["LEAD", "/reports/leads"],
              ["CAMPAIGN", "/reports/campaigns"],
              ["TELEPHONY", "/reports/telephony"],
              ["DOCUMENT", "/reports/documents"],
              ["NOTIFICATION", "/reports/notifications"],
            ] as const
          ).map(([type, href]) => (
            <li key={type}>
              <Link href={href} className="underline underline-offset-4">
                {REPORT_TYPE_LABELS[type]} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        {canManage ? (
          <Link href="/reports/saved" className="underline underline-offset-4">
            Saved Reports →
          </Link>
        ) : null}
        {canManageDashboards ? (
          <Link href="/reports/dashboards" className="underline underline-offset-4">
            Dashboards →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
