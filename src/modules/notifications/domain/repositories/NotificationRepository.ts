// ============================================================================
// src/modules/notifications/domain/repositories/NotificationRepository.ts
// ============================================================================

import type {
  Notification,
  NotificationCategory,
  NotificationStatus,
  RecipientType,
} from "../entities/Notification";
import type { ChannelType } from "../entities/NotificationTemplate";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../entities/NotificationsAuditRecord";

export interface CreateNotificationData {
  organizationId: string;
  category: NotificationCategory;
  templateId: string;
  templateVersionId: string;
  recipientType: RecipientType;
  recipientId: string;
  payload: Record<string, unknown>;
  status?: NotificationStatus;
}

export interface ListNotificationsFilter {
  status?: NotificationStatus;
  statuses?: NotificationStatus[];
  category?: NotificationCategory;
  recipientType?: RecipientType;
  recipientId?: string;
  templateId?: string;
  channelType?: ChannelType;
  limit?: number;
  offset?: number;
}

export interface NotificationsByChannelEntry {
  channelType: ChannelType;
  count: number;
}

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  list(organizationId: string, filter?: ListNotificationsFilter): Promise<Notification[]>;
  count(organizationId: string, filter?: ListNotificationsFilter): Promise<number>;
  listRecent(organizationId: string, limit: number): Promise<Notification[]>;

  createWithAudit(
    data: CreateNotificationData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<Notification>;

  updateStatusWithAudit(
    id: string,
    status: NotificationStatus,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<Notification>;

  countByChannel(organizationId: string): Promise<NotificationsByChannelEntry[]>;
  listAuditLog(notificationId: string): Promise<NotificationsAuditRecord[]>;
}
