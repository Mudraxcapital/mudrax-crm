import type {
  NotificationQueue,
  NotificationQueueEntry,
} from "../../domain/entities/NotificationQueue";

export interface NotificationQueueDto {
  id: string;
  organizationId: string;
  channelType: NotificationQueue["channelType"];
  priority: number;
  status: NotificationQueue["status"];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQueueEntryDto {
  id: string;
  notificationQueueId: string;
  notificationId: string;
  triggerType: NotificationQueueEntry["triggerType"];
  scheduledFor: string | null;
  status: NotificationQueueEntry["status"];
  createdAt: string;
  updatedAt: string;
}

export function toNotificationQueueDto(queue: NotificationQueue): NotificationQueueDto {
  return {
    id: queue.id,
    organizationId: queue.organizationId,
    channelType: queue.channelType,
    priority: queue.priority,
    status: queue.status,
    createdAt: queue.createdAt.toISOString(),
    updatedAt: queue.updatedAt.toISOString(),
  };
}

export function toNotificationQueueEntryDto(
  entry: NotificationQueueEntry,
): NotificationQueueEntryDto {
  return {
    id: entry.id,
    notificationQueueId: entry.notificationQueueId,
    notificationId: entry.notificationId,
    triggerType: entry.triggerType,
    scheduledFor: entry.scheduledFor?.toISOString() ?? null,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}
