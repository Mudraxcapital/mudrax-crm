import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { getCustomer } from "@/modules/customers";
import {
  getNotification,
  listNotificationDeliveries,
  listNotificationHistory,
  NotificationNotFoundError,
} from "@/modules/notifications";
import { getUser } from "@/modules/users";
import { resolveDisplayName } from "@/shared/ui/displayName";

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

  const [deliveries, history, recipient] = await Promise.all([
    listNotificationDeliveries(authContext.organizationId, id),
    listNotificationHistory(authContext.organizationId, id),
    notification.recipientType === "USER"
      ? getUser(notification.recipientId).catch(() => null)
      : getCustomer(notification.recipientId).catch(() => null),
  ]);

  const recipientName = resolveDisplayName(recipient?.fullName);
  const recipientLabel =
    notification.recipientType === "CUSTOMER" ? "Customer" : "User";

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/notifications" className="text-sm text-accent hover:underline underline-offset-4">
        ← Notifications
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notification</h1>
        <p className="text-muted mt-1 text-sm">
          {notification.channelType ?? "—"} · {notification.status} · {notification.category}
        </p>
      </div>

      <section className="rounded-xl border border-border p-6 text-sm ">
        <dl className="grid grid-cols-2 gap-y-2">
          <dt className="text-muted">Template</dt>
          <dd>{notification.templateCode ?? "—"}</dd>
          <dt className="text-muted">Recipient</dt>
          <dd>
            {recipientName}
            <span className="text-muted ml-1 text-xs">({recipientLabel})</span>
          </dd>
          <dt className="text-muted">Created</dt>
          <dd>{new Date(notification.createdAt).toLocaleString()}</dd>
        </dl>
      </section>

      <section className="mx-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 ">
          <h2 className="text-sm font-medium">Deliveries</h2>
        </div>
        <ul className="flex flex-col">
          {deliveries.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">No deliveries yet.</li>
          ) : (
            deliveries.map((delivery) => (
              <li
                key={delivery.id}
                className="border-b border-border px-4 py-3 text-sm last:border-0 "
              >
                <div className="flex items-center justify-between">
                  <span>{delivery.status}</span>
                  <span className="text-muted">
                    {new Date(delivery.createdAt).toLocaleString()}
                  </span>
                </div>
                {delivery.failureReason ? (
                  <p className="text-muted mt-1 text-xs">{delivery.failureReason}</p>
                ) : null}
                {delivery.retryOfDeliveryId ? (
                  <p className="text-muted mt-1 font-mono text-xs">
                    Retry of delivery: {delivery.retryOfDeliveryId}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mx-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 ">
          <h2 className="text-sm font-medium">History</h2>
        </div>
        <ul className="flex flex-col">
          {history.map((entry) => (
            <li
              key={`${entry.id}-${entry.occurredAt}`}
              className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-0 "
            >
              <span>{entry.eventType}</span>
              <span className="text-muted">
                {new Date(entry.occurredAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
