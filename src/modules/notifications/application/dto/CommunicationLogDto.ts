import type { CommunicationLogEntry } from "../../domain/entities/CommunicationLogEntry";

export interface CommunicationLogDto {
  id: string;
  organizationId: string;
  notificationId: string;
  notificationDeliveryId: string | null;
  eventType: string;
  details: Record<string, unknown> | null;
  occurredAt: string;
  recordHash: string;
  previousRecordHash: string | null;
}

export function toCommunicationLogDto(entry: CommunicationLogEntry): CommunicationLogDto {
  return {
    id: entry.id,
    organizationId: entry.organizationId,
    notificationId: entry.notificationId,
    notificationDeliveryId: entry.notificationDeliveryId,
    eventType: entry.eventType,
    details: entry.details,
    occurredAt: entry.occurredAt.toISOString(),
    recordHash: entry.recordHash,
    previousRecordHash: entry.previousRecordHash,
  };
}
