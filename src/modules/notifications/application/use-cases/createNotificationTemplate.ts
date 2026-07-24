import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";
import { DuplicateNotificationTemplateCodeError } from "../../domain/errors/NotificationErrors";
import type { CreateNotificationTemplateInput } from "../validators/notificationSchemas";
import {
  toNotificationTemplateDto,
  type NotificationTemplateDto,
} from "../dto/NotificationTemplateDto";

export interface CreateNotificationTemplateCommand {
  organizationId: string;
  input: CreateNotificationTemplateInput;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
}

export function makeCreateNotificationTemplate(repository: NotificationTemplateRepository) {
  return async function createNotificationTemplate(
    command: CreateNotificationTemplateCommand,
  ): Promise<NotificationTemplateDto> {
    const { organizationId, input, actor, correlationId } = command;

    const existing = await repository.findByCode(organizationId, input.code);
    if (existing) {
      throw new DuplicateNotificationTemplateCodeError(input.code);
    }

    const { template, version } = await repository.createWithAudit(
      {
        organizationId,
        code: input.code,
        channelType: input.channelType,
        status: input.publish ? "ACTIVE" : "DRAFT",
        subject: input.subject ?? null,
        body: input.body,
      },
      actor,
      correlationId,
    );

    let published = null;
    if (input.publish) {
      published = await repository.publishVersionWithAudit(version.id, actor, correlationId);
    }

    return toNotificationTemplateDto(template, published);
  };
}
