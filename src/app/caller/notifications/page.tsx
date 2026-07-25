import Link from "next/link";
import { requireCallerWorkspace } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listNotifications } from "@/modules/notifications";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";

export default async function CallerNotificationsPage() {
  const { session, authContext } = await requireCallerWorkspace();
  const canView = hasPermission(authContext, "notification.view");

  const notifications = canView
    ? await listNotifications(authContext.organizationId, { limit: 80 }).catch(() => [])
    : [];

  const mine = notifications.filter(
    (item) => item.recipientType === "USER" && item.recipientId === session.user.id,
  );

  return (
    <PageSection>
      <PageHeader
        title="Notifications"
        description="Notifications addressed to you."
        actions={
          hasPermission(authContext, "notification.preference.manage") ? (
            <Link href="/notifications/preferences">
              <Button variant="secondary" size="sm">
                Preferences
              </Button>
            </Link>
          ) : null
        }
      />

      <Card>
        <CardBody className="space-y-2">
          {!canView ? (
            <p className="text-muted text-sm">You do not have notification visibility.</p>
          ) : mine.length === 0 ? (
            <p className="text-muted text-sm">No notifications yet.</p>
          ) : (
            mine.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.templateCode ?? "Notification"}</p>
                  <p className="text-muted truncate text-xs">
                    {item.status} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge tone="neutral">{item.channelType ?? item.category}</Badge>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </PageSection>
  );
}
