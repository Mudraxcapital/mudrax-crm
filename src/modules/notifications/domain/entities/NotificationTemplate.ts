// ============================================================================
// src/modules/notifications/domain/entities/NotificationTemplate.ts
//
// Aggregate Root for reusable, versioned notification content (ADR 0008,
// docs/modules/notifications.md). Global by default (`organizationId =
// null`), with Organization-specific overrides by reference. Every content
// edit produces a new Template Version; a live Notification always pins
// the exact Version it used.
// ============================================================================

export const CHANNEL_TYPES = ["EMAIL", "SMS", "WHATSAPP", "PUSH", "IN_APP", "WEBHOOK"] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

/**
 * Channels the send / queue path can deliver today.
 * EMAIL/SMS/WhatsApp use the Null provider stub; IN_APP is the CRM bell/inbox.
 */
export const SENDABLE_CHANNEL_TYPES = ["EMAIL", "SMS", "WHATSAPP", "IN_APP"] as const;
export type SendableChannelType = (typeof SENDABLE_CHANNEL_TYPES)[number];

export function isSendableChannelType(value: string): value is SendableChannelType {
  return (SENDABLE_CHANNEL_TYPES as readonly string[]).includes(value);
}

export const NOTIFICATION_TEMPLATE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "DEPRECATED",
  "ARCHIVED",
] as const;
export type NotificationTemplateStatus = (typeof NOTIFICATION_TEMPLATE_STATUSES)[number];

export interface NotificationTemplate {
  id: string;
  organizationId: string | null;
  code: string;
  channelType: ChannelType;
  status: NotificationTemplateStatus;
  createdAt: Date;
  updatedAt: Date;
}
