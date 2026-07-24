import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateNotificationTemplateData,
  CreateTemplateVersionData,
  ListNotificationTemplatesFilter,
  NotificationTemplateRepository,
  UpdateNotificationTemplateData,
} from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationTemplate } from "../../domain/entities/NotificationTemplate";
import type { NotificationTemplateVersion } from "../../domain/entities/NotificationTemplateVersion";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../../domain/entities/NotificationsAuditRecord";
import {
  toNotificationTemplate,
  toNotificationTemplateVersion,
  toNotificationsAuditRecord,
} from "../mappers/notificationsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toTemplateAuditJson(template: NotificationTemplate): Prisma.InputJsonValue {
  return {
    id: template.id,
    organizationId: template.organizationId,
    code: template.code,
    channelType: template.channelType,
    status: template.status,
  };
}

function toVersionAuditJson(version: NotificationTemplateVersion): Prisma.InputJsonValue {
  return {
    id: version.id,
    templateId: version.templateId,
    versionNumber: version.versionNumber,
    status: version.status,
    subject: version.subject,
  };
}

export class PrismaNotificationTemplateRepository implements NotificationTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<NotificationTemplate | null> {
    const row = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    return row ? toNotificationTemplate(row) : null;
  }

  async findByCode(organizationId: string, code: string): Promise<NotificationTemplate | null> {
    const row = await this.prisma.notificationTemplate.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    return row ? toNotificationTemplate(row) : null;
  }

  async list(
    organizationId: string,
    filter?: ListNotificationTemplatesFilter,
  ): Promise<NotificationTemplate[]> {
    const where: Prisma.NotificationTemplateWhereInput = { organizationId };
    if (filter?.channelType) where.channelType = filter.channelType;
    if (filter?.status) {
      where.status = filter.status;
    } else if (!filter?.includeArchived) {
      where.status = { not: "ARCHIVED" };
    }
    const rows = await this.prisma.notificationTemplate.findMany({
      where,
      orderBy: { code: "asc" },
      take: filter?.limit ?? 100,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toNotificationTemplate);
  }

  async findVersionById(id: string): Promise<NotificationTemplateVersion | null> {
    const row = await this.prisma.notificationTemplateVersion.findUnique({ where: { id } });
    return row ? toNotificationTemplateVersion(row) : null;
  }

  async listVersions(templateId: string): Promise<NotificationTemplateVersion[]> {
    const rows = await this.prisma.notificationTemplateVersion.findMany({
      where: { templateId },
      orderBy: { versionNumber: "desc" },
    });
    return rows.map(toNotificationTemplateVersion);
  }

  async findLatestPublishedVersion(
    templateId: string,
  ): Promise<NotificationTemplateVersion | null> {
    const row = await this.prisma.notificationTemplateVersion.findFirst({
      where: { templateId, status: "PUBLISHED" },
      orderBy: { versionNumber: "desc" },
    });
    return row ? toNotificationTemplateVersion(row) : null;
  }

  async createWithAudit(
    data: CreateNotificationTemplateData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<{ template: NotificationTemplate; version: NotificationTemplateVersion }> {
    return this.prisma.$transaction(async (tx) => {
      const templateRow = await tx.notificationTemplate.create({
        data: {
          organizationId: data.organizationId,
          code: data.code,
          channelType: data.channelType,
          status: data.status ?? "DRAFT",
        },
      });
      const template = toNotificationTemplate(templateRow);

      const versionRow = await tx.notificationTemplateVersion.create({
        data: {
          templateId: template.id,
          versionNumber: 1,
          subject: data.subject ?? null,
          body: data.body,
          variables: (data.variables ?? undefined) as Prisma.InputJsonValue | undefined,
          status: "DRAFT",
        },
      });
      const version = toNotificationTemplateVersion(versionRow);

      await tx.notificationAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationTemplateCreated",
          targetType: "NotificationTemplate",
          targetId: template.id,
          correlationId: correlationId ?? null,
          afterState: toTemplateAuditJson(template),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return { template, version };
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateNotificationTemplateData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationTemplate> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.notificationTemplate.findUniqueOrThrow({ where: { id } });
      const before = toNotificationTemplate(beforeRow);
      const afterRow = await tx.notificationTemplate.update({
        where: { id },
        data: { status: data.status },
      });
      const after = toNotificationTemplate(afterRow);

      await tx.notificationAuditLog.create({
        data: {
          organizationId: after.organizationId ?? before.organizationId!,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationTemplateUpdated",
          targetType: "NotificationTemplate",
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toTemplateAuditJson(before),
          afterState: toTemplateAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async archiveWithAudit(
    id: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationTemplate> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.notificationTemplate.findUniqueOrThrow({ where: { id } });
      const before = toNotificationTemplate(beforeRow);
      const afterRow = await tx.notificationTemplate.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
      const after = toNotificationTemplate(afterRow);
      await tx.notificationAuditLog.create({
        data: {
          organizationId: after.organizationId ?? before.organizationId!,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationTemplateArchived",
          targetType: "NotificationTemplate",
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toTemplateAuditJson(before),
          afterState: toTemplateAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return after;
    });
  }

  async createVersionWithAudit(
    data: CreateTemplateVersionData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationTemplateVersion> {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.notificationTemplateVersion.findFirst({
        where: { templateId: data.templateId },
        orderBy: { versionNumber: "desc" },
      });
      const template = await tx.notificationTemplate.findUniqueOrThrow({
        where: { id: data.templateId },
      });

      const versionRow = await tx.notificationTemplateVersion.create({
        data: {
          templateId: data.templateId,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          subject: data.subject ?? null,
          body: data.body,
          variables: (data.variables ?? undefined) as Prisma.InputJsonValue | undefined,
          status: data.status ?? "DRAFT",
        },
      });
      const version = toNotificationTemplateVersion(versionRow);

      await tx.notificationAuditLog.create({
        data: {
          organizationId: template.organizationId!,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationTemplateVersionCreated",
          targetType: "NotificationTemplateVersion",
          targetId: version.id,
          correlationId: correlationId ?? null,
          afterState: toVersionAuditJson(version),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return version;
    });
  }

  async publishVersionWithAudit(
    versionId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationTemplateVersion> {
    return this.prisma.$transaction(async (tx) => {
      const versionRow = await tx.notificationTemplateVersion.findUniqueOrThrow({
        where: { id: versionId },
      });
      const template = await tx.notificationTemplate.findUniqueOrThrow({
        where: { id: versionRow.templateId },
      });

      await tx.notificationTemplateVersion.updateMany({
        where: {
          templateId: versionRow.templateId,
          status: "PUBLISHED",
          id: { not: versionId },
        },
        data: { status: "SUPERSEDED" },
      });

      const publishedRow = await tx.notificationTemplateVersion.update({
        where: { id: versionId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      const published = toNotificationTemplateVersion(publishedRow);

      await tx.notificationAuditLog.create({
        data: {
          organizationId: template.organizationId!,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationTemplateVersionPublished",
          targetType: "NotificationTemplateVersion",
          targetId: published.id,
          correlationId: correlationId ?? null,
          afterState: toVersionAuditJson(published),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return published;
    });
  }

  async listAuditLog(targetId: string, targetType?: string): Promise<NotificationsAuditRecord[]> {
    const rows = await this.prisma.notificationAuditLog.findMany({
      where: {
        targetId,
        ...(targetType ? { targetType } : {}),
      },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(toNotificationsAuditRecord);
  }
}
