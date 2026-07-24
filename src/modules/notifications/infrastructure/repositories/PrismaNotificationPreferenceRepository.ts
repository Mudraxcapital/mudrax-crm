import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ListNotificationPreferencesFilter,
  NotificationPreferenceRepository,
  UpsertNotificationPreferenceData,
} from "../../domain/repositories/NotificationPreferenceRepository";
import type { ChannelType } from "../../domain/entities/NotificationTemplate";
import type { RecipientType } from "../../domain/entities/Notification";
import type { NotificationPreference } from "../../domain/entities/NotificationPreference";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../../domain/entities/NotificationsAuditRecord";
import {
  toNotificationPreference,
  toNotificationsAuditRecord,
} from "../mappers/notificationsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(preference: NotificationPreference): Prisma.InputJsonValue {
  return {
    id: preference.id,
    recipientType: preference.recipientType,
    recipientId: preference.recipientId,
    eventCategory: preference.eventCategory,
    channelType: preference.channelType,
    isEnabled: preference.isEnabled,
    status: preference.status,
  };
}

export class PrismaNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<NotificationPreference | null> {
    const row = await this.prisma.notificationPreference.findUnique({ where: { id } });
    return row ? toNotificationPreference(row) : null;
  }

  async findForRecipient(
    recipientType: RecipientType,
    recipientId: string,
    eventCategory: string,
    channelType?: ChannelType | null,
  ): Promise<NotificationPreference | null> {
    const row = await this.prisma.notificationPreference.findFirst({
      where: {
        recipientType,
        recipientId,
        eventCategory,
        channelType: channelType ?? null,
      },
    });
    return row ? toNotificationPreference(row) : null;
  }

  async list(filter?: ListNotificationPreferencesFilter): Promise<NotificationPreference[]> {
    const where: Prisma.NotificationPreferenceWhereInput = {};
    if (filter?.recipientType) where.recipientType = filter.recipientType;
    if (filter?.recipientId) where.recipientId = filter.recipientId;
    if (filter?.eventCategory) where.eventCategory = filter.eventCategory;

    const rows = await this.prisma.notificationPreference.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: filter?.limit ?? 100,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toNotificationPreference);
  }

  async upsertWithAudit(
    data: UpsertNotificationPreferenceData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationPreference> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.notificationPreference.findFirst({
        where: {
          recipientType: data.recipientType,
          recipientId: data.recipientId,
          eventCategory: data.eventCategory,
          channelType: data.channelType ?? null,
        },
      });

      let preference: NotificationPreference;
      if (existing) {
        const before = toNotificationPreference(existing);
        const afterRow = await tx.notificationPreference.update({
          where: { id: existing.id },
          data: {
            isEnabled: data.isEnabled,
            status: "UPDATED",
          },
        });
        preference = toNotificationPreference(afterRow);
        await tx.notificationAuditLog.create({
          data: {
            organizationId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            action: "NotificationPreferenceUpdated",
            targetType: "NotificationPreference",
            targetId: preference.id,
            correlationId: correlationId ?? null,
            beforeState: toAuditJson(before),
            afterState: toAuditJson(preference),
            recordHash: PLACEHOLDER_RECORD_HASH,
          },
        });
      } else {
        const created = await tx.notificationPreference.create({
          data: {
            recipientType: data.recipientType,
            recipientId: data.recipientId,
            eventCategory: data.eventCategory,
            channelType: data.channelType ?? null,
            isEnabled: data.isEnabled,
            status: "CREATED",
          },
        });
        preference = toNotificationPreference(created);
        await tx.notificationAuditLog.create({
          data: {
            organizationId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            action: "NotificationPreferenceCreated",
            targetType: "NotificationPreference",
            targetId: preference.id,
            correlationId: correlationId ?? null,
            afterState: toAuditJson(preference),
            recordHash: PLACEHOLDER_RECORD_HASH,
          },
        });
      }

      return preference;
    });
  }

  async listAuditLog(preferenceId: string): Promise<NotificationsAuditRecord[]> {
    const rows = await this.prisma.notificationAuditLog.findMany({
      where: { targetType: "NotificationPreference", targetId: preferenceId },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(toNotificationsAuditRecord);
  }
}
