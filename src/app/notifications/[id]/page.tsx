import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  getNotification,
  listNotificationDeliveries,
  listNotificationHistory,
  NotificationNotFoundError,
} from "@/modules/notifications";

export default async function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authContext } = await requirePermission("notification.view");

  let notification;
  try {
    notification = await getNotification(authContext.organizationId, id);
  } catch (error) {
    if (error instanceof NotificationNotFoundError) notFound();
    throw error;
  }

  const [deliveries, history] = await Promise.all([
    listNotificationDeliveries(authContext.organizationId, id),
    listNotificationHistory(authContext.organizationId, id),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/notifications" className="text-sm underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Notification</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          {notification.channelType ?? "—"} · {notification.status} · {notification.category}
        </p>
      </div>

      <section className="rounded-xl border border-black/10 p-6 text-sm dark:border-white/15">
        <dl className="grid grid-cols-2 gap-y-2">
          <dt className="text-foreground/60">Template</dt>
          <dd>{notification.templateCode ?? notification.templateId}</dd>
          <dt className="text-foreground/60">Recipient</dt>
          <dd>
            {notification.recipientType} · {notification.recipientId}
          </dd>
          <dt className="text-foreground/60">Created</dt>
          <dd>{new Date(notification.createdAt).toLocaleString()}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Deliveries</h2>
        </div>
        <ul className="flex flex-col">
          {deliveries.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No deliveries yet.</li>
          ) : (
            deliveries.map((delivery) => (
              <li
                key={delivery.id}
                className="border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <div className="flex items-center justify-between">
                  <span>{delivery.status}</span>
                  <span className="text-foreground/60">
                    {new Date(delivery.createdAt).toLocaleString()}
                  </span>
                </div>
                {delivery.failureReason ? (
                  <p className="text-foreground/60 mt-1 text-xs">{delivery.failureReason}</p>
                ) : null}
                {delivery.retryOfDeliveryId ? (
                  <p className="text-foreground/60 mt-1 text-xs">
                    Retry of {delivery.retryOfDeliveryId}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">History</h2>
        </div>
        <ul className="flex flex-col">
          {history.map((entry) => (
            <li
              key={`${entry.id}-${entry.occurredAt}`}
              className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
            >
              <span>{entry.eventType}</span>
              <span className="text-foreground/60">
                {new Date(entry.occurredAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
