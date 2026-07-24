// ============================================================================
// src/modules/notifications/domain/entities/NotificationsAuditRecord.ts
//
// One immutable, append-only fact about a change to a notifications module
// configuration aggregate (Template, Preference, Queue) — the canonical
// Audit Record shape platform-contracts.md §4 requires. Backed by
// notifications.notification_audit_log (additive, mirroring telephony's
// telephony_audit_log). Notification/Delivery history itself lives in
// Communication Log.
// ============================================================================

export const NOTIFICATIONS_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;

export type NotificationsActorType = (typeof NOTIFICATIONS_ACTOR_TYPES)[number];

export const NOTIFICATIONS_AUDIT_TARGET_TYPES = [
  "NotificationTemplate",
  "NotificationTemplateVersion",
  "Notification",
  "NotificationDelivery",
  "NotificationQueue",
  "NotificationQueueEntry",
  "NotificationPreference",
] as const;

export type NotificationsAuditTargetType = (typeof NOTIFICATIONS_AUDIT_TARGET_TYPES)[number];

export interface NotificationsAuditActor {
  actorType: NotificationsActorType;
  actorId: string | null;
}

export interface NotificationsAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: NotificationsActorType;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  recordHash: string;
  previousRecordHash: string | null;
}
