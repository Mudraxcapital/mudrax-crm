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
    <div className="mx-page flex flex-col gap-6">
      <Link href="/notifications" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notification Queue</h1>
        <p className="text-muted mt-1 text-sm">
          Pending / Processing / Sent / Failed / Cancelled work items.
        </p>
      </div>

      <QueueControls
        processAction={processNotificationQueueAction}
        retryAction={retryFailedDeliveriesAction}
      />

      <section className="mx-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 ">
          <h2 className="text-sm font-medium">Queue Entries</h2>
        </div>
        <ul className="flex flex-col">
          {entries.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">Queue is empty.</li>
          ) : (
            entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-0 "
              >
                <Link
                  href={`/notifications/${entry.notificationId}`}
                  className="text-accent hover:text-accent hover:underline underline-offset-4"
                >
                  {entry.status} · {entry.triggerType}
                </Link>
                <span className="text-muted">
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
