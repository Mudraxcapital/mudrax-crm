import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getNotificationsDashboard } from "@/modules/notifications";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { TabNav } from "@/shared/ui/Tabs";
import { EmptyState } from "@/shared/ui/EmptyState";

export default async function NotificationsDashboardPage() {
  const { authContext } = await requirePermission("notifications.dashboard.view");
  const canManageTemplates = hasPermission(authContext, "notification.template.manage");
  const canSend = hasPermission(authContext, "notification.send");
  const dashboard = await getNotificationsDashboard(authContext.organizationId);

  return (
    <PageSection>
      <PageHeader
        title="Notifications"
        description="Email, SMS, and WhatsApp delivery across the organization."
        actions={
          <>
            {canManageTemplates ? (
              <Link href="/notifications/templates">
                <Button variant="secondary">Templates</Button>
              </Link>
            ) : null}
            {canSend ? (
              <Link href="/notifications/send">
                <Button>Send</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <TabNav
        activeHref="/notifications"
        items={[
          { href: "/notifications", label: "Overview" },
          { href: "/notifications/history", label: "History" },
          { href: "/notifications/queue", label: "Queue" },
          { href: "/notifications/templates", label: "Templates" },
          ...(canSend ? [{ href: "/notifications/send", label: "Send" }] : []),
        ]}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={dashboard.totalNotifications} />
        <StatCard label="Pending" value={dashboard.pending} />
        <StatCard label="Sent" value={dashboard.sent} />
        <StatCard label="Failed" value={dashboard.failed} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Channel breakdown" />
          <CardBody>
            <BarList
              data={dashboard.channelBreakdown.map((entry) => ({
                key: entry.channelType,
                label: entry.channelType,
                value: entry.count,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent notifications"
            actions={
              <Link href="/notifications/history">
                <Button variant="ghost" size="sm">
                  History
                </Button>
              </Link>
            }
          />
          <CardBody className="p-0">
            {dashboard.recentNotifications.length === 0 ? (
              <EmptyState title="No notifications yet" />
            ) : (
              <ul className="divide-y divide-border">
                {dashboard.recentNotifications.map((notification) => (
                  <li key={notification.id}>
                    <Link
                      href={`/notifications/${notification.id}`}
                      className="hover:bg-accent-muted/30 flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors"
                    >
                      <span className="font-medium">{notification.channelType ?? "—"}</span>
                      <Badge tone={statusTone(notification.status)}>{notification.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PageSection>
  );
}
