import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";
import { NotificationTemplateNotFoundError } from "../../domain/errors/NotificationErrors";
import {
  toNotificationTemplateDto,
  type NotificationTemplateDto,
} from "../dto/NotificationTemplateDto";

export interface ArchiveNotificationTemplateCommand {
  organizationId: string;
  templateId: string;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
}

export function makeArchiveNotificationTemplate(repository: NotificationTemplateRepository) {
  return async function archiveNotificationTemplate(
    command: ArchiveNotificationTemplateCommand,
  ): Promise<NotificationTemplateDto> {
    const { organizationId, templateId, actor, correlationId } = command;

    const existing = await repository.findById(templateId);
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotificationTemplateNotFoundError(templateId);
    }

    const archived = await repository.archiveWithAudit(templateId, actor, correlationId);
    return toNotificationTemplateDto(archived, null);
  };
}
