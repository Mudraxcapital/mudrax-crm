import type { NotificationTemplate } from "../../domain/entities/NotificationTemplate";
import type { NotificationTemplateVersion } from "../../domain/entities/NotificationTemplateVersion";

export interface NotificationTemplateVersionDto {
  id: string;
  templateId: string;
  versionNumber: number;
  subject: string | null;
  body: string;
  variables: Record<string, unknown> | null;
  status: NotificationTemplateVersion["status"];
  publishedAt: string | null;
  createdAt: string;
}

export interface NotificationTemplateDto {
  id: string;
  organizationId: string | null;
  code: string;
  channelType: NotificationTemplate["channelType"];
  status: NotificationTemplate["status"];
  currentPublishedVersionId: string | null;
  currentPublishedVersionNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export function toNotificationTemplateVersionDto(
  version: NotificationTemplateVersion,
): NotificationTemplateVersionDto {
  return {
    id: version.id,
    templateId: version.templateId,
    versionNumber: version.versionNumber,
    subject: version.subject,
    body: version.body,
    variables: version.variables,
    status: version.status,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    createdAt: version.createdAt.toISOString(),
  };
}

export function toNotificationTemplateDto(
  template: NotificationTemplate,
  publishedVersion?: NotificationTemplateVersion | null,
): NotificationTemplateDto {
  return {
    id: template.id,
    organizationId: template.organizationId,
    code: template.code,
    channelType: template.channelType,
    status: template.status,
    currentPublishedVersionId: publishedVersion?.id ?? null,
    currentPublishedVersionNumber: publishedVersion?.versionNumber ?? null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
