import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listNotificationQueueEntries } from "@/modules/notifications";
import { QueueControls } from "@/modules/notifications/presentation/components/QueueControls";
import {
  processNotificationQueueAction,
  retryFailedDeliveriesAction,
} from "@/modules/notifications/presentation/controllers/processNotificationQueue.action";

export default async function NotificationQueuePage() {
  const { authContext } = await requirePermission("notification.view");
  const entries = await listNotificationQueueEntries(authContext.organizationId, { limit: 50 });

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/notifications" className="text-sm underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Notification Queue</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Pending / Processing / Sent / Failed / Cancelled work items.
        </p>
      </div>

      <QueueControls
        processAction={processNotificationQueueAction}
        retryAction={retryFailedDeliveriesAction}
      />

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Queue Entries</h2>
        </div>
        <ul className="flex flex-col">
          {entries.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">Queue is empty.</li>
          ) : (
            entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <Link
                  href={`/notifications/${entry.notificationId}`}
                  className="underline underline-offset-4"
                >
                  {entry.status} · {entry.triggerType}
                </Link>
                <span className="text-foreground/60">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
