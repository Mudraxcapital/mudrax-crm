import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listNotificationHistory } from "@/modules/notifications";

export default async function NotificationHistoryPage() {
  const { authContext } = await requirePermission("notification.view");
  const history = await listNotificationHistory(authContext.organizationId, undefined, 100);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/notifications" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notification History</h1>
        <p className="text-muted mt-1 text-sm">
          Append-only Communication Log of every notification attempt.
        </p>
      </div>

      <section className="mx-card overflow-hidden">
        <ul className="flex flex-col">
          {history.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">No history yet.</li>
          ) : (
            history.map((entry) => (
              <li
                key={`${entry.id}-${entry.occurredAt}`}
                className="border-b border-border px-4 py-3 text-sm last:border-0 "
              >
                <div className="flex items-center justify-between gap-4">
                  <Link
                    href={`/notifications/${entry.notificationId}`}
                    className="text-accent hover:text-accent hover:underline underline-offset-4"
                  >
                    {entry.eventType}
                  </Link>
                  <span className="text-muted">
                    {new Date(entry.occurredAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
