import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listNotificationHistory } from "@/modules/notifications";

export default async function NotificationHistoryPage() {
  const { authContext } = await requirePermission("notification.view");
  const history = await listNotificationHistory(authContext.organizationId, undefined, 100);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/notifications" className="text-sm underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Notification History</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Append-only Communication Log of every notification attempt.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <ul className="flex flex-col">
          {history.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No history yet.</li>
          ) : (
            history.map((entry) => (
              <li
                key={`${entry.id}-${entry.occurredAt}`}
                className="border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <Link
                    href={`/notifications/${entry.notificationId}`}
                    className="underline underline-offset-4"
                  >
                    {entry.eventType}
                  </Link>
                  <span className="text-foreground/60">
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
