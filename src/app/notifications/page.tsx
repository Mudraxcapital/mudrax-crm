import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getNotificationsDashboard } from "@/modules/notifications";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
      <p className="text-foreground/60 text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default async function NotificationsDashboardPage() {
  const { authContext } = await requirePermission("notifications.dashboard.view");
  const canManageTemplates = hasPermission(authContext, "notification.template.manage");
  const canSend = hasPermission(authContext, "notification.send");

  const dashboard = await getNotificationsDashboard(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Notifications Dashboard</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Overview of Email, SMS, and WhatsApp notification activity.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={dashboard.totalNotifications} />
        <StatCard label="Pending" value={dashboard.pending} />
        <StatCard label="Sent" value={dashboard.sent} />
        <StatCard label="Failed" value={dashboard.failed} />
      </section>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Channel Breakdown</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {dashboard.channelBreakdown.length === 0 ? (
            <li className="text-foreground/60">No Notifications yet.</li>
          ) : (
            dashboard.channelBreakdown.map((entry) => (
              <li key={entry.channelType} className="flex items-center justify-between">
                <span>{entry.channelType}</span>
                <span className="font-medium">{entry.count}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Recent Notifications</h2>
          <Link href="/notifications/history" className="text-xs underline underline-offset-4">
            History →
          </Link>
        </div>
        <ul className="flex flex-col">
          {dashboard.recentNotifications.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">
              No Notifications yet.
            </li>
          ) : (
            dashboard.recentNotifications.map((notification) => (
              <li
                key={notification.id}
                className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <Link
                  href={`/notifications/${notification.id}`}
                  className="underline underline-offset-4"
                >
                  {notification.channelType ?? "—"} · {notification.status}
                </Link>
                <span className="text-foreground/60">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        {canSend ? (
          <Link href="/notifications/send" className="underline underline-offset-4">
            Send →
          </Link>
        ) : null}
        {canManageTemplates ? (
          <Link href="/notifications/templates" className="underline underline-offset-4">
            Templates →
          </Link>
        ) : null}
        <Link href="/notifications/queue" className="underline underline-offset-4">
          Queue →
        </Link>
        <Link href="/notifications/history" className="underline underline-offset-4">
          History →
        </Link>
        <Link href="/notifications/preferences" className="underline underline-offset-4">
          Preferences →
        </Link>
      </nav>
    </div>
  );
}
