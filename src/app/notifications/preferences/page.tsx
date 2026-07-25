import { requirePermission } from "@/infra/auth/session";
import { listCustomers } from "@/modules/customers";
import { listNotificationPreferences } from "@/modules/notifications";
import { listUserSummaries } from "@/modules/users";
import { NotificationPreferenceForm } from "@/modules/notifications/presentation/components/NotificationPreferenceForm";
import { upsertNotificationPreferenceAction } from "@/modules/notifications/presentation/controllers/upsertNotificationPreference.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { TabNav } from "@/shared/ui/Tabs";

export default async function NotificationPreferencesPage() {
  const { session, authContext } = await requirePermission("notification.preference.manage");

  const [preferences, users, customers] = await Promise.all([
    listNotificationPreferences({ limit: 100 }),
    listUserSummaries(authContext.organizationId),
    listCustomers(authContext.organizationId),
  ]);

  return (
    <PageSection>
      <PageHeader
        title="Settings"
        description="Notification preferences and delivery controls. Transactional and OTP always deliver."
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Preferences" }]}
      />

      <TabNav
        activeHref="/notifications/preferences"
        items={[
          { href: "/settings", label: "Settings hub" },
          { href: "/notifications/preferences", label: "Preferences" },
          { href: "/users", label: "User Management" },
        ]}
      />

      <Card>
        <CardHeader
          title="Upsert preference"
          description="Configure channel preferences for users or customers."
        />
        <CardBody>
          <NotificationPreferenceForm
            action={upsertNotificationPreferenceAction}
            defaultRecipientId={session.user.id}
            users={users.map((user) => ({ id: user.id, fullName: user.fullName }))}
            customers={customers.map((customer) => ({
              id: customer.id,
              label: customer.fullName,
            }))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Saved preferences" />
        <CardBody className="p-0">
          {preferences.length === 0 ? (
            <EmptyState title="No preferences saved" description="Create one above to get started." />
          ) : (
            <ul className="divide-y divide-border">
              {preferences.map((preference) => (
                <li
                  key={preference.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <span>
                    {preference.recipientType} · {preference.eventCategory}
                    {preference.channelType ? ` · ${preference.channelType}` : ""}
                  </span>
                  <Badge tone={preference.isEnabled ? "success" : "neutral"} dot>
                    {preference.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </PageSection>
  );
}
