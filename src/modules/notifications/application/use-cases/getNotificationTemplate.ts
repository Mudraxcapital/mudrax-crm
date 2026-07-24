import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { ListNotificationTemplatesFilter } from "../../domain/repositories/NotificationTemplateRepository";
import { NotificationTemplateNotFoundError } from "../../domain/errors/NotificationErrors";
import {
  toNotificationTemplateDto,
  toNotificationTemplateVersionDto,
  type NotificationTemplateDto,
  type NotificationTemplateVersionDto,
} from "../dto/NotificationTemplateDto";

export function makeGetNotificationTemplate(repository: NotificationTemplateRepository) {
  return async function getNotificationTemplate(
    organizationId: string,
    templateId: string,
  ): Promise<NotificationTemplateDto> {
    const template = await repository.findById(templateId);
    if (!template || template.organizationId !== organizationId) {
      throw new NotificationTemplateNotFoundError(templateId);
    }
    const published = await repository.findLatestPublishedVersion(templateId);
    return toNotificationTemplateDto(template, published);
  };
}

export function makeListNotificationTemplates(repository: NotificationTemplateRepository) {
  return async function listNotificationTemplates(
    organizationId: string,
    filter?: ListNotificationTemplatesFilter,
  ): Promise<NotificationTemplateDto[]> {
    const templates = await repository.list(organizationId, filter);
    return Promise.all(
      templates.map(async (template) => {
        const published = await repository.findLatestPublishedVersion(template.id);
        return toNotificationTemplateDto(template, published);
      }),
    );
  };
}

export function makeListTemplateVersions(repository: NotificationTemplateRepository) {
  return async function listTemplateVersions(
    organizationId: string,
    templateId: string,
  ): Promise<NotificationTemplateVersionDto[]> {
    const template = await repository.findById(templateId);
    if (!template || template.organizationId !== organizationId) {
      throw new NotificationTemplateNotFoundError(templateId);
    }
    const versions = await repository.listVersions(templateId);
    return versions.map(toNotificationTemplateVersionDto);
  };
}
