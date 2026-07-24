import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateDeliveryData,
  CreateRetryData,
  NotificationDeliveryRepository,
  UpdateDeliveryStatusData,
} from "../../domain/repositories/NotificationDeliveryRepository";
import type { NotificationDelivery } from "../../domain/entities/NotificationDelivery";
import type { NotificationRetry } from "../../domain/entities/NotificationRetry";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../../domain/entities/NotificationsAuditRecord";
import {
  toNotificationDelivery,
  toNotificationRetry,
  toNotificationsAuditRecord,
} from "../mappers/notificationsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(delivery: NotificationDelivery): Prisma.InputJsonValue {
  return {
    id: delivery.id,
    notificationId: delivery.notificationId,
    providerId: delivery.providerId,
    status: delivery.status,
    retryOfDeliveryId: delivery.retryOfDeliveryId,
    failureReason: delivery.failureReason,
  };
}

export class PrismaNotificationDeliveryRepository implements NotificationDeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<NotificationDelivery | null> {
    const row = await this.prisma.notificationDelivery.findUnique({ where: { id } });
    return row ? toNotificationDelivery(row) : null;
  }

  async listByNotification(notificationId: string): Promise<NotificationDelivery[]> {
    const rows = await this.prisma.notificationDelivery.findMany({
      where: { notificationId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toNotificationDelivery);
  }

  async listFailedEligibleForRetry(
    organizationId: string,
    now: Date,
    limit = 25,
  ): Promise<NotificationDelivery[]> {
    const retries = await this.prisma.notificationRetry.findMany({
      where: {
        nextEligibleAt: { lte: now },
        notificationDelivery: {
          status: "FAILED",
          notification: { organizationId },
        },
      },
      include: { notificationDelivery: true },
      orderBy: { nextEligibleAt: "asc" },
      take: limit,
    });
    return retries.map((retry) => toNotificationDelivery(retry.notificationDelivery));
  }

  async createWithAudit(
    data: CreateDeliveryData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationDelivery> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.notificationDelivery.create({
        data: {
          notificationId: data.notificationId,
          providerId: data.providerId,
          status: data.status ?? "QUEUED",
          retryOfDeliveryId: data.retryOfDeliveryId ?? null,
        },
      });
      const delivery = toNotificationDelivery(row);
      await tx.notificationAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationDeliveryCreated",
          targetType: "NotificationDelivery",
          targetId: delivery.id,
          correlationId: correlationId ?? null,
          afterState: toAuditJson(delivery),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return delivery;
    });
  }

  async updateStatusWithAudit(
    id: string,
    data: UpdateDeliveryStatusData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationDelivery> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.notificationDelivery.findUniqueOrThrow({ where: { id } });
      const before = toNotificationDelivery(beforeRow);
      const afterRow = await tx.notificationDelivery.update({
        where: { id },
        data: {
          status: data.status,
          sentAt: data.sentAt,
          deliveredAt: data.deliveredAt,
          failureReason: data.failureReason,
        },
      });
      const after = toNotificationDelivery(afterRow);
      await tx.notificationAuditLog.create({
        data: {
          organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "NotificationDeliveryStatusChanged",
          targetType: "NotificationDelivery",
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

  async createRetry(data: CreateRetryData): Promise<NotificationRetry> {
    const row = await this.prisma.notificationRetry.create({
      data: {
        notificationDeliveryId: data.notificationDeliveryId,
        attemptNumber: data.attemptNumber,
        backoffSeconds: data.backoffSeconds,
        nextEligibleAt: data.nextEligibleAt,
      },
    });
    return toNotificationRetry(row);
  }

  async listRetries(deliveryId: string): Promise<NotificationRetry[]> {
    const rows = await this.prisma.notificationRetry.findMany({
      where: { notificationDeliveryId: deliveryId },
      orderBy: { attemptNumber: "asc" },
    });
    return rows.map(toNotificationRetry);
  }

  async countRetryChain(deliveryId: string): Promise<number> {
    // Count deliveries in the retry chain ending at this delivery (including itself).
    let currentId: string | null = deliveryId;
    let count = 0;
    while (currentId) {
      count += 1;
      const row: { retryOfDeliveryId: string | null } | null =
        await this.prisma.notificationDelivery.findUnique({
          where: { id: currentId },
          select: { retryOfDeliveryId: true },
        });
      currentId = row?.retryOfDeliveryId ?? null;
    }
    return count;
  }

  async listAuditLog(deliveryId: string): Promise<NotificationsAuditRecord[]> {
    const rows = await this.prisma.notificationAuditLog.findMany({
      where: { targetType: "NotificationDelivery", targetId: deliveryId },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(toNotificationsAuditRecord);
  }
}
