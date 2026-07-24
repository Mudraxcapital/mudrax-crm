import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import {
  PENDING_NOTIFICATION_STATUSES,
  SENT_NOTIFICATION_STATUSES,
} from "../../domain/entities/Notification";
import { toNotificationDto } from "../dto/NotificationDto";
import type { NotificationsDashboardDto } from "../dto/NotificationsDashboardDto";

export function makeGetNotificationsDashboard(
  repository: NotificationRepository,
  templateRepository: NotificationTemplateRepository,
) {
  return async function getNotificationsDashboard(
    organizationId: string,
  ): Promise<NotificationsDashboardDto> {
    const [totalNotifications, pending, sent, failed, channelBreakdown, recent] = await Promise.all(
      [
        repository.count(organizationId),
        repository.count(organizationId, { statuses: PENDING_NOTIFICATION_STATUSES }),
        repository.count(organizationId, { statuses: SENT_NOTIFICATION_STATUSES }),
        repository.count(organizationId, { status: "FAILED" }),
        repository.countByChannel(organizationId),
        repository.listRecent(organizationId, 20),
      ],
    );

    const templatesById = new Map();
    for (const notification of recent) {
      if (!templatesById.has(notification.templateId)) {
        const template = await templateRepository.findById(notification.templateId);
        if (template) templatesById.set(template.id, template);
      }
    }

    return {
      totalNotifications,
      pending,
      sent,
      failed,
      channelBreakdown,
      recentNotifications: recent.map((item) => toNotificationDto(item, { templatesById })),
    };
  };
}
