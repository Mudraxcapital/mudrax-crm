import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationDeliveryRepository } from "../../domain/repositories/NotificationDeliveryRepository";
import type { ListNotificationsFilter } from "../../domain/repositories/NotificationRepository";
import { NotificationNotFoundError } from "../../domain/errors/NotificationErrors";
import { toNotificationDto, type NotificationDto } from "../dto/NotificationDto";
import {
  toNotificationDeliveryDto,
  type NotificationDeliveryDto,
} from "../dto/NotificationDeliveryDto";

async function loadTemplateLookups(
  templateRepository: NotificationTemplateRepository,
  templateIds: string[],
) {
  const templatesById = new Map();
  for (const id of new Set(templateIds)) {
    const template = await templateRepository.findById(id);
    if (template) templatesById.set(id, template);
  }
  return { templatesById };
}

export function makeGetNotification(
  repository: NotificationRepository,
  templateRepository: NotificationTemplateRepository,
) {
  return async function getNotification(
    organizationId: string,
    notificationId: string,
  ): Promise<NotificationDto> {
    const notification = await repository.findById(notificationId);
    if (!notification || notification.organizationId !== organizationId) {
      throw new NotificationNotFoundError(notificationId);
    }
    const lookups = await loadTemplateLookups(templateRepository, [notification.templateId]);
    return toNotificationDto(notification, lookups);
  };
}

export function makeListNotifications(
  repository: NotificationRepository,
  templateRepository: NotificationTemplateRepository,
) {
  return async function listNotifications(
    organizationId: string,
    filter?: ListNotificationsFilter,
  ): Promise<NotificationDto[]> {
    const notifications = await repository.list(organizationId, filter);
    const lookups = await loadTemplateLookups(
      templateRepository,
      notifications.map((item) => item.templateId),
    );
    return notifications.map((item) => toNotificationDto(item, lookups));
  };
}

export function makeListNotificationDeliveries(deliveryRepository: NotificationDeliveryRepository) {
  return async function listNotificationDeliveries(
    organizationId: string,
    notificationId: string,
    notificationRepository: NotificationRepository,
  ): Promise<NotificationDeliveryDto[]> {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification || notification.organizationId !== organizationId) {
      throw new NotificationNotFoundError(notificationId);
    }
    const deliveries = await deliveryRepository.listByNotification(notificationId);
    return deliveries.map(toNotificationDeliveryDto);
  };
}
