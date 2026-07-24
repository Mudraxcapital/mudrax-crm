// ============================================================================
// src/modules/notifications/domain/repositories/NotificationQueueRepository.ts
// ============================================================================

import type { ChannelType } from "../entities/NotificationTemplate";
import type {
  NotificationQueue,
  NotificationQueueEntry,
  QueueEntryStatus,
  TriggerType,
} from "../entities/NotificationQueue";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../entities/NotificationsAuditRecord";

export interface EnqueueNotificationData {
  organizationId: string;
  channelType: ChannelType;
  notificationId: string;
  priority?: number;
  triggerType?: TriggerType;
  scheduledFor?: Date | null;
}

export interface ListQueueEntriesFilter {
  status?: QueueEntryStatus;
  statuses?: QueueEntryStatus[];
  channelType?: ChannelType;
  limit?: number;
  offset?: number;
}

export interface NotificationQueueRepository {
  findById(id: string): Promise<NotificationQueue | null>;
  getOrCreate(
    organizationId: string,
    channelType: ChannelType,
    priority?: number,
  ): Promise<NotificationQueue>;

  findEntryById(id: string): Promise<NotificationQueueEntry | null>;
  listEntries(
    organizationId: string,
    filter?: ListQueueEntriesFilter,
  ): Promise<NotificationQueueEntry[]>;
  listPendingEntries(
    organizationId: string,
    limit?: number,
    now?: Date,
  ): Promise<NotificationQueueEntry[]>;

  enqueueWithAudit(
    data: EnqueueNotificationData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<{ queue: NotificationQueue; entry: NotificationQueueEntry }>;

  updateEntryStatusWithAudit(
    entryId: string,
    status: QueueEntryStatus,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationQueueEntry>;

  listAuditLog(targetId: string): Promise<NotificationsAuditRecord[]>;
}
