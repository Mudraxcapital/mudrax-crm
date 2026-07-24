// ============================================================================
// src/modules/notifications/domain/entities/NotificationLifecycle.ts
//
// Allowed Notification status transitions (docs/modules/notifications.md
// state diagram). Immutable once Queued for content — status rolls up as
// deliveries complete.
// ============================================================================

import type { NotificationStatus } from "./Notification";

const ALLOWED: Record<NotificationStatus, readonly NotificationStatus[]> = {
  CREATED: ["RESOLVED", "CANCELLED"],
  RESOLVED: ["QUEUED", "CANCELLED"],
  QUEUED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DELIVERED", "PARTIALLY_DELIVERED", "FAILED", "CANCELLED"],
  DELIVERED: ["CLOSED"],
  PARTIALLY_DELIVERED: ["CLOSED", "FAILED"],
  FAILED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export function canTransitionNotificationStatus(
  from: NotificationStatus,
  to: NotificationStatus,
): boolean {
  return ALLOWED[from].includes(to);
}
