import Link from "next/link";
import type { NotificationDto } from "../../application/dto/NotificationDto";
import {
  inAppNotificationBody,
  inAppNotificationTitle,
  isFollowUpNotification,
} from "../lib/inAppNotificationCopy";

export function NotificationChannelList({
  notifications,
  emptyLabel = "No notifications yet.",
  followUpsHref = "/follow-ups",
}: {
  notifications: NotificationDto[];
  emptyLabel?: string;
  followUpsHref?: string;
}) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-border px-4 py-8 text-center">
        <p className="text-muted text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {notifications.map((item) => {
        const followUp = isFollowUpNotification(item.templateCode);
        return (
          <li key={item.id} className="bg-surface px-4 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{inAppNotificationTitle(item.templateCode)}</p>
                <p className="text-muted text-xs leading-relaxed">
                  {inAppNotificationBody(item.templateCode, item.payload)}
                </p>
                <p className="text-muted text-[11px]">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              {followUp ? (
                <Link
                  href={followUpsHref}
                  className="text-accent shrink-0 text-xs font-medium hover:underline underline-offset-4"
                >
                  Open Follow-ups
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
