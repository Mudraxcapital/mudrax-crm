import { requireCallerWorkspace } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listNotifications } from "@/modules/notifications";
import { notificationRecipientFilter } from "@/shared/auth/notificationRecipientFilter";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";

export default async function CallerNotificationsPage() {
  const { session, authContext } = await requireCallerWorkspace();
  const canView = hasPermission(authContext, "notification.view");

  const notifications = canView
    ? await listNotifications(
        authContext.organizationId,
        notificationRecipientFilter(authContext, {
          permissionCode: "notification.view",
          actorUserId: session.user.id,
          limit: 80,
        }) as never,
      ).catch(() => [])
    : [];

  return (
    <PageSection>
      <PageHeader title="Notifications" description="Notifications addressed to you." />

      <Card>
        <CardBody className="space-y-2">
          {!canView ? (
            <p className="text-muted text-sm">You do not have notification visibility.</p>
          ) : notifications.length === 0 ? (
            <p className="text-muted text-sm">No notifications yet.</p>
          ) : (
            notifications.map((item) => (
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
