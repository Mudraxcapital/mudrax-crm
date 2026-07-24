// ============================================================================
// src/modules/notifications/domain/entities/CommunicationLogEntry.ts
//
// Aggregate Root, platform-level, structurally append-only. Permanent
// record of every significant Notification/Delivery lifecycle transition
// — the Notification History source of truth (ADR 0008, platform-
// contracts.md §4).
// ============================================================================

export interface CommunicationLogEntry {
  id: string;
  organizationId: string;
  notificationId: string;
  notificationDeliveryId: string | null;
  eventType: string;
  details: Record<string, unknown> | null;
  occurredAt: Date;
  recordHash: string;
  previousRecordHash: string | null;
}
