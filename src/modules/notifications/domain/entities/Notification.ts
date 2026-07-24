// ============================================================================
// src/modules/notifications/domain/entities/Notification.ts
//
// Aggregate Root for the business intent to communicate something to
// someone (ADR 0008). Immutable once Queued — a correction always creates
// a new Notification and cancels the old one. Email/SMS/WhatsApp are
// Channel strategies (via the pinned Template's ChannelType), not distinct
// entity types.
// ============================================================================

export const NOTIFICATION_CATEGORIES = [
  "TRANSACTIONAL",
  "OTP",
  "OPERATIONAL",
  "MARKETING",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_STATUSES = [
  "CREATED",
  "RESOLVED",
  "QUEUED",
  "IN_PROGRESS",
  "DELIVERED",
  "PARTIALLY_DELIVERED",
  "FAILED",
  "CLOSED",
  "CANCELLED",
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const RECIPIENT_TYPES = ["USER", "CUSTOMER"] as const;
export type RecipientType = (typeof RECIPIENT_TYPES)[number];

/** Dashboard "Pending" bucket — not yet finally sent/failed/cancelled. */
export const PENDING_NOTIFICATION_STATUSES: NotificationStatus[] = [
  "CREATED",
  "RESOLVED",
  "QUEUED",
  "IN_PROGRESS",
];

/** Dashboard "Sent" bucket. */
export const SENT_NOTIFICATION_STATUSES: NotificationStatus[] = [
  "DELIVERED",
  "PARTIALLY_DELIVERED",
  "CLOSED",
];

export interface Notification {
  id: string;
  organizationId: string;
  category: NotificationCategory;
  templateId: string;
  templateVersionId: string;
  recipientType: RecipientType;
  recipientId: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  batchId: string | null;
  broadcastId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Categories that Preferences may suppress (docs/modules/notifications.md). */
export function isPreferenceApplicableCategory(category: NotificationCategory): boolean {
  return category === "OPERATIONAL" || category === "MARKETING";
}
