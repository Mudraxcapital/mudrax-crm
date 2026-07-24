import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listCustomers } from "@/modules/customers";
import { listNotificationPreferences } from "@/modules/notifications";
import { listUserSummaries } from "@/modules/users";
import { NotificationPreferenceForm } from "@/modules/notifications/presentation/components/NotificationPreferenceForm";
import { upsertNotificationPreferenceAction } from "@/modules/notifications/presentation/controllers/upsertNotificationPreference.action";

export default async function NotificationPreferencesPage() {
  const { session, authContext } = await requirePermission("notification.preference.manage");

  const [preferences, users, customers] = await Promise.all([
    listNotificationPreferences({ limit: 100 }),
    listUserSummaries(authContext.organizationId),
    listCustomers(authContext.organizationId),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/notifications" className="text-sm underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Notification Preferences</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Per-user / per-customer preferences. Transactional and OTP always deliver.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <NotificationPreferenceForm
          action={upsertNotificationPreferenceAction}
          defaultRecipientId={session.user.id}
          users={users.map((user) => ({ id: user.id, fullName: user.fullName }))}
          customers={customers.map((customer) => ({
            id: customer.id,
            label: customer.fullName,
          }))}
        />
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Saved Preferences</h2>
        </div>
        <ul className="flex flex-col">
          {preferences.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">
              No preferences saved.
            </li>
          ) : (
            preferences.map((preference) => (
              <li
                key={preference.id}
                className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <span>
                  {preference.recipientType} · {preference.eventCategory}
                  {preference.channelType ? ` · ${preference.channelType}` : ""}
                </span>
                <span className="text-foreground/60">
                  {preference.isEnabled ? "Enabled" : "Disabled"}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
