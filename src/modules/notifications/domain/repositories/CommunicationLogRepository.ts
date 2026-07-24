// ============================================================================
// src/modules/notifications/domain/repositories/CommunicationLogRepository.ts
// ============================================================================

import type { CommunicationLogEntry } from "../entities/CommunicationLogEntry";

export interface AppendCommunicationLogData {
  organizationId: string;
  notificationId: string;
  notificationDeliveryId?: string | null;
  eventType: string;
  details?: Record<string, unknown> | null;
}

export interface ListCommunicationLogFilter {
  notificationId?: string;
  limit?: number;
  offset?: number;
}

export interface CommunicationLogRepository {
  append(data: AppendCommunicationLogData): Promise<CommunicationLogEntry>;
  list(
    organizationId: string,
    filter?: ListCommunicationLogFilter,
  ): Promise<CommunicationLogEntry[]>;
  listByNotification(notificationId: string): Promise<CommunicationLogEntry[]>;
}
