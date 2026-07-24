import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";
import {
  NotificationTemplateArchivedError,
  NotificationTemplateNotFoundError,
} from "../../domain/errors/NotificationErrors";
import type { CreateTemplateVersionInput } from "../validators/notificationSchemas";
import {
  toNotificationTemplateVersionDto,
  type NotificationTemplateVersionDto,
} from "../dto/NotificationTemplateDto";

export interface CreateTemplateVersionCommand {
  organizationId: string;
  templateId: string;
  input: CreateTemplateVersionInput;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
}

export function makeCreateTemplateVersion(repository: NotificationTemplateRepository) {
  return async function createTemplateVersion(
    command: CreateTemplateVersionCommand,
  ): Promise<NotificationTemplateVersionDto> {
    const { organizationId, templateId, input, actor, correlationId } = command;

    const template = await repository.findById(templateId);
    if (!template || template.organizationId !== organizationId) {
      throw new NotificationTemplateNotFoundError(templateId);
    }
    if (template.status === "ARCHIVED") {
      throw new NotificationTemplateArchivedError(templateId);
    }

    const version = await repository.createVersionWithAudit(
      {
        templateId,
        subject: input.subject ?? null,
        body: input.body,
      },
      actor,
      correlationId,
    );

    if (input.publish) {
      const published = await repository.publishVersionWithAudit(version.id, actor, correlationId);
      if (template.status === "DRAFT") {
        await repository.updateWithAudit(templateId, { status: "ACTIVE" }, actor, correlationId);
      }
      return toNotificationTemplateVersionDto(published);
    }

    return toNotificationTemplateVersionDto(version);
  };
}
