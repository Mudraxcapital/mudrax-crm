// ============================================================================
// src/modules/notifications/domain/repositories/NotificationTemplateRepository.ts
// ============================================================================

import type {
  ChannelType,
  NotificationTemplate,
  NotificationTemplateStatus,
} from "../entities/NotificationTemplate";
import type {
  NotificationTemplateVersion,
  TemplateVersionStatus,
} from "../entities/NotificationTemplateVersion";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../entities/NotificationsAuditRecord";

export interface CreateNotificationTemplateData {
  organizationId: string;
  code: string;
  channelType: ChannelType;
  status?: NotificationTemplateStatus;
  subject?: string | null;
  body: string;
  variables?: Record<string, unknown> | null;
}

export interface UpdateNotificationTemplateData {
  status?: NotificationTemplateStatus;
}

export interface CreateTemplateVersionData {
  templateId: string;
  subject?: string | null;
  body: string;
  variables?: Record<string, unknown> | null;
  status?: TemplateVersionStatus;
}

export interface ListNotificationTemplatesFilter {
  channelType?: ChannelType;
  status?: NotificationTemplateStatus;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationTemplateRepository {
  findById(id: string): Promise<NotificationTemplate | null>;
  findByCode(organizationId: string, code: string): Promise<NotificationTemplate | null>;
  list(
    organizationId: string,
    filter?: ListNotificationTemplatesFilter,
  ): Promise<NotificationTemplate[]>;

  findVersionById(id: string): Promise<NotificationTemplateVersion | null>;
  listVersions(templateId: string): Promise<NotificationTemplateVersion[]>;
  findLatestPublishedVersion(templateId: string): Promise<NotificationTemplateVersion | null>;

  createWithAudit(
    data: CreateNotificationTemplateData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<{ template: NotificationTemplate; version: NotificationTemplateVersion }>;

  updateWithAudit(
    id: string,
    data: UpdateNotificationTemplateData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationTemplate>;

  archiveWithAudit(
    id: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationTemplate>;

  createVersionWithAudit(
    data: CreateTemplateVersionData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationTemplateVersion>;

  publishVersionWithAudit(
    versionId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationTemplateVersion>;

  listAuditLog(targetId: string, targetType?: string): Promise<NotificationsAuditRecord[]>;
}
