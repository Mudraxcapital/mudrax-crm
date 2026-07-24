import type { CommunicationLogRepository } from "../../domain/repositories/CommunicationLogRepository";
import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import { NotificationNotFoundError } from "../../domain/errors/NotificationErrors";
import { toCommunicationLogDto, type CommunicationLogDto } from "../dto/CommunicationLogDto";

export function makeListNotificationHistory(
  communicationLogRepository: CommunicationLogRepository,
  notificationRepository: NotificationRepository,
) {
  return async function listNotificationHistory(
    organizationId: string,
    notificationId?: string,
    limit = 50,
  ): Promise<CommunicationLogDto[]> {
    if (notificationId) {
      const notification = await notificationRepository.findById(notificationId);
      if (!notification || notification.organizationId !== organizationId) {
        throw new NotificationNotFoundError(notificationId);
      }
      const entries = await communicationLogRepository.listByNotification(notificationId);
      return entries.map(toCommunicationLogDto);
    }

    const entries = await communicationLogRepository.list(organizationId, { limit });
    return entries.map(toCommunicationLogDto);
  };
}
