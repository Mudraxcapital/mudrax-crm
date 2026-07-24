import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateNotificationData,
  ListNotificationsFilter,
  NotificationRepository,
  NotificationsByChannelEntry,
} from "../../domain/repositories/NotificationRepository";
import type { Notification, NotificationStatus } from "../../domain/entities/Notification";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../../domain/entities/NotificationsAuditRecord";
import { toNotification, toNotificationsAuditRecord } from "../mappers/notificationsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(notification: Notification): Prisma.InputJsonValue {
  return {
    id: notification.id,
    organizationId: notification.organizationId,
    category: notification.category,
    templateId: notification.templateId,
    templateVersionId: notification.templateVersionId,
    recipientType: notification.recipientType,
    recipientId: notification.recipientId,
    status: notification.status,
  };
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Notification | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? toNotification(row) : null;
  }

  async list(organizationId: string, filter?: ListNotificationsFilter): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: this.buildWhere(organizationId, filter),
      orderBy: { createdAt: "desc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toNotification);
  }

  async count(organizationId: string, filter?: ListNotificationsFilter): Promise<number> {
    return this.prisma.notification.count({ where: this.buildWhere(organizationId, filter) });
  }

  async listRecent(organizationId: string, limit: number): Promise<Notification[]> {
    return this.list(organizationId, { limit });
  }

  private buildWhere(
    organizationId: string,
    filter?: ListNotificationsFilter,
  ): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = { organizationId };
    if (filter?.statuses?.length) where.status = { in: filter.statuses };
    else if (filter?.status) where.status = filter.status;
    if (filter?.category) where.category = filter.category;
    if (filter?.recipientType) where.recipientType = filter.recipientType;
    if (filter?.recipientId) where.recipientId = filter.recipientId;
    if (filter?.templateId) where.templateId = filter.templateId;
    if (filter?.channelType) {
      where.template = { channelType: filter.channelType };
    }
    return where;
  }

  async createWithAudit(
    data: CreateNotificationData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<Notification> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.notification.create({
        data: {
          organizationId: data.organizationId,
          category: data.category,
          templateId: data.templateId,
          templateVersionId: data.templateVersionId,
          recipientType: data.recipientType,
          recipientId: data.recipientId,
          payload: data.payload as Prisma.InputJsonValue,
          status: data.status ?? "CREATED",
        },
      });
      const notification = toNotification(row);
      await tx.notificationAuditLog.create({
        data: {
          organizationId: notification.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationCreated",
          targetType: "Notification",
          targetId: notification.id,
          correlationId: correlationId ?? null,
          afterState: toAuditJson(notification),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return notification;
    });
  }

  async updateStatusWithAudit(
    id: string,
    status: NotificationStatus,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<Notification> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.notification.findUniqueOrThrow({ where: { id } });
      const before = toNotification(beforeRow);
      const afterRow = await tx.notification.update({ where: { id }, data: { status } });
      const after = toNotification(afterRow);
      await tx.notificationAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationStatusChanged",
          targetType: "Notification",
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return after;
    });
  }

  async countByChannel(organizationId: string): Promise<NotificationsByChannelEntry[]> {
    const rows = await this.prisma.notification.groupBy({
      by: ["templateId"],
      where: { organizationId },
      _count: { _all: true },
    });
    if (rows.length === 0) return [];

    const templates = await this.prisma.notificationTemplate.findMany({
      where: { id: { in: rows.map((row) => row.templateId) } },
    });
    const channelByTemplate = new Map(templates.map((t) => [t.id, t.channelType]));
    const counts = new Map<string, number>();
    for (const row of rows) {
      const channelType = channelByTemplate.get(row.templateId);
      if (!channelType) continue;
      counts.set(channelType, (counts.get(channelType) ?? 0) + row._count._all);
    }
    return [...counts.entries()].map(([channelType, count]) => ({
      channelType: channelType as NotificationsByChannelEntry["channelType"],
      count,
    }));
  }

  async listAuditLog(notificationId: string): Promise<NotificationsAuditRecord[]> {
    const rows = await this.prisma.notificationAuditLog.findMany({
      where: { targetType: "Notification", targetId: notificationId },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(toNotificationsAuditRecord);
  }
}
