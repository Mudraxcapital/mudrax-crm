import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";
import {
  NotificationTemplateArchivedError,
  NotificationTemplateNotFoundError,
} from "../../domain/errors/NotificationErrors";
import type { UpdateNotificationTemplateInput } from "../validators/notificationSchemas";
import {
  toNotificationTemplateDto,
  type NotificationTemplateDto,
} from "../dto/NotificationTemplateDto";

export interface UpdateNotificationTemplateCommand {
  organizationId: string;
  templateId: string;
  input: UpdateNotificationTemplateInput;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
}

export function makeUpdateNotificationTemplate(repository: NotificationTemplateRepository) {
  return async function updateNotificationTemplate(
    command: UpdateNotificationTemplateCommand,
  ): Promise<NotificationTemplateDto> {
    const { organizationId, templateId, input, actor, correlationId } = command;

    const existing = await repository.findById(templateId);
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotificationTemplateNotFoundError(templateId);
    }
    if (existing.status === "ARCHIVED") {
      throw new NotificationTemplateArchivedError(templateId);
    }

    const updated = await repository.updateWithAudit(templateId, input, actor, correlationId);
    const published = await repository.findLatestPublishedVersion(templateId);
    return toNotificationTemplateDto(updated, published);
  };
}
