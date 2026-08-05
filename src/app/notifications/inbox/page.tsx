import { requirePermission } from "@/infra/auth/session";
import { listNotifications } from "@/modules/notifications";
import { NotificationChannelList } from "@/modules/notifications/presentation/components/NotificationChannelList";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";

/**
 * Personal notification channel — Caller, Team Lead, Manager, and Admin.
 * Always scoped to the signed-in user as recipient.
 */
export default async function NotificationInboxPage() {
  const { session, authContext } = await requirePermission("notification.view");

  const notifications = await listNotifications(authContext.organizationId, {
    recipientType: "USER",
    recipientId: session.user.id,
    limit: 100,
  }).catch(() => []);

  return (
    <PageSection>
      <PageHeader
        title="Notification Channel"
        description="Follow-up reminders, escalations, and other alerts addressed to you."
      />
      <NotificationChannelList notifications={notifications} />
    </PageSection>
  );
}
