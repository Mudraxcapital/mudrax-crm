import type { Notification } from "../../domain/entities/Notification";
import type { NotificationTemplate } from "../../domain/entities/NotificationTemplate";

export interface NotificationDto {
  id: string;
  organizationId: string;
  category: Notification["category"];
  templateId: string;
  templateCode: string | null;
  channelType: NotificationTemplate["channelType"] | null;
  templateVersionId: string;
  recipientType: Notification["recipientType"];
  recipientId: string;
  payload: Record<string, unknown>;
  status: Notification["status"];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLookups {
  templatesById: ReadonlyMap<string, NotificationTemplate>;
}

export function toNotificationDto(
  notification: Notification,
  lookups?: NotificationLookups,
): NotificationDto {
  const template = lookups?.templatesById.get(notification.templateId);
  return {
    id: notification.id,
    organizationId: notification.organizationId,
    category: notification.category,
    templateId: notification.templateId,
    templateCode: template?.code ?? null,
    channelType: template?.channelType ?? null,
    templateVersionId: notification.templateVersionId,
    recipientType: notification.recipientType,
    recipientId: notification.recipientId,
    payload: notification.payload,
    status: notification.status,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  };
}
