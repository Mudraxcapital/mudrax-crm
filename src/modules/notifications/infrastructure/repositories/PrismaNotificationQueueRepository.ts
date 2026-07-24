import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  EnqueueNotificationData,
  ListQueueEntriesFilter,
  NotificationQueueRepository,
} from "../../domain/repositories/NotificationQueueRepository";
import type { ChannelType } from "../../domain/entities/NotificationTemplate";
import type {
  NotificationQueue,
  NotificationQueueEntry,
  QueueEntryStatus,
} from "../../domain/entities/NotificationQueue";
import { PENDING_QUEUE_ENTRY_STATUSES } from "../../domain/entities/NotificationQueue";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../../domain/entities/NotificationsAuditRecord";
import {
  toNotificationQueue,
  toNotificationQueueEntry,
  toNotificationsAuditRecord,
} from "../mappers/notificationsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaNotificationQueueRepository implements NotificationQueueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<NotificationQueue | null> {
    const row = await this.prisma.notificationQueue.findUnique({ where: { id } });
    return row ? toNotificationQueue(row) : null;
  }

  async getOrCreate(
    organizationId: string,
    channelType: ChannelType,
    priority = 0,
  ): Promise<NotificationQueue> {
    const existing = await this.prisma.notificationQueue.findUnique({
      where: {
        organizationId_channelType_priority: { organizationId, channelType, priority },
      },
    });
    if (existing) return toNotificationQueue(existing);

    const created = await this.prisma.notificationQueue.create({
      data: { organizationId, channelType, priority, status: "ACTIVE" },
    });
    return toNotificationQueue(created);
  }

  async findEntryById(id: string): Promise<NotificationQueueEntry | null> {
    const row = await this.prisma.notificationQueueEntry.findUnique({ where: { id } });
    return row ? toNotificationQueueEntry(row) : null;
  }

  async listEntries(
    organizationId: string,
    filter?: ListQueueEntriesFilter,
  ): Promise<NotificationQueueEntry[]> {
    const where: Prisma.NotificationQueueEntryWhereInput = {
      notificationQueue: {
        organizationId,
        ...(filter?.channelType ? { channelType: filter.channelType } : {}),
      },
    };
    if (filter?.statuses?.length) where.status = { in: filter.statuses };
    else if (filter?.status) where.status = filter.status;

    const rows = await this.prisma.notificationQueueEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toNotificationQueueEntry);
  }

  async listPendingEntries(
    organizationId: string,
    limit = 25,
    now: Date = new Date(),
  ): Promise<NotificationQueueEntry[]> {
    const rows = await this.prisma.notificationQueueEntry.findMany({
      where: {
        status: { in: PENDING_QUEUE_ENTRY_STATUSES },
        notificationQueue: { organizationId, status: "ACTIVE" },
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
      },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
      take: limit,
    });
    return rows.map(toNotificationQueueEntry);
  }

  async enqueueWithAudit(
    data: EnqueueNotificationData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<{ queue: NotificationQueue; entry: NotificationQueueEntry }> {
    return this.prisma.$transaction(async (tx) => {
      const queueRow = await tx.notificationQueue.upsert({
        where: {
          organizationId_channelType_priority: {
            organizationId: data.organizationId,
            channelType: data.channelType,
            priority: data.priority ?? 0,
          },
        },
        update: {},
        create: {
          organizationId: data.organizationId,
          channelType: data.channelType,
          priority: data.priority ?? 0,
          status: "ACTIVE",
        },
      });
      const queue = toNotificationQueue(queueRow);

      const entryRow = await tx.notificationQueueEntry.create({
        data: {
          notificationQueueId: queue.id,
          notificationId: data.notificationId,
          triggerType: data.triggerType ?? "IMMEDIATE",
          scheduledFor: data.scheduledFor ?? null,
          status: data.scheduledFor ? "ENQUEUED" : "ELIGIBLE",
        },
      });
      const entry = toNotificationQueueEntry(entryRow);

      await tx.notificationAuditLog.create({
        data: {
          organizationId: data.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationQueueEntryEnqueued",
          targetType: "NotificationQueueEntry",
          targetId: entry.id,
          correlationId: correlationId ?? null,
          afterState: {
            id: entry.id,
            notificationId: entry.notificationId,
            status: entry.status,
            triggerType: entry.triggerType,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return { queue, entry };
    });
  }

  async updateEntryStatusWithAudit(
    entryId: string,
    status: QueueEntryStatus,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationQueueEntry> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.notificationQueueEntry.findUniqueOrThrow({
        where: { id: entryId },
      });
      const before = toNotificationQueueEntry(beforeRow);
      const afterRow = await tx.notificationQueueEntry.update({
        where: { id: entryId },
        data: { status },
      });
      const after = toNotificationQueueEntry(afterRow);

      await tx.notificationAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationQueueEntryStatusChanged",
          targetType: "NotificationQueueEntry",
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: { id: before.id, status: before.status },
          afterState: { id: after.id, status: after.status },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async listAuditLog(targetId: string): Promise<NotificationsAuditRecord[]> {
    const rows = await this.prisma.notificationAuditLog.findMany({
      where: { targetId },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(toNotificationsAuditRecord);
  }
}
