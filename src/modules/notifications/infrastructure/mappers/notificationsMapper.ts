// ============================================================================
// src/modules/notifications/infrastructure/mappers/notificationsMapper.ts
// ============================================================================

import type {
  NotificationTemplate as PrismaNotificationTemplate,
  NotificationTemplateVersion as PrismaNotificationTemplateVersion,
  Notification as PrismaNotification,
  NotificationDelivery as PrismaNotificationDelivery,
  NotificationRetry as PrismaNotificationRetry,
  NotificationQueue as PrismaNotificationQueue,
  NotificationQueueEntry as PrismaNotificationQueueEntry,
  NotificationPreference as PrismaNotificationPreference,
  NotificationChannel as PrismaNotificationChannel,
  Provider as PrismaProvider,
  CommunicationLog as PrismaCommunicationLog,
  NotificationAuditLog as PrismaNotificationAuditLog,
} from "@prisma/client";
import type { NotificationTemplate } from "../../domain/entities/NotificationTemplate";
import type { NotificationTemplateVersion } from "../../domain/entities/NotificationTemplateVersion";
import type { Notification } from "../../domain/entities/Notification";
import type { NotificationDelivery } from "../../domain/entities/NotificationDelivery";
import type { NotificationRetry } from "../../domain/entities/NotificationRetry";
import type {
  NotificationQueue,
  NotificationQueueEntry,
} from "../../domain/entities/NotificationQueue";
import type { NotificationPreference } from "../../domain/entities/NotificationPreference";
import type { NotificationChannel, Provider } from "../../domain/entities/NotificationChannel";
import type { CommunicationLogEntry } from "../../domain/entities/CommunicationLogEntry";
import type { NotificationsAuditRecord } from "../../domain/entities/NotificationsAuditRecord";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function toNotificationTemplate(row: PrismaNotificationTemplate): NotificationTemplate {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    channelType: row.channelType,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toNotificationTemplateVersion(
  row: PrismaNotificationTemplateVersion,
): NotificationTemplateVersion {
  return {
    id: row.id,
    templateId: row.templateId,
    versionNumber: row.versionNumber,
    subject: row.subject,
    body: row.body,
    variables: asRecord(row.variables),
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
  };
}

export function toNotification(row: PrismaNotification): Notification {
  return {
    id: row.id,
    organizationId: row.organizationId,
    category: row.category,
    templateId: row.templateId,
    templateVersionId: row.templateVersionId,
    recipientType: row.recipientType,
    recipientId: row.recipientId,
    payload: asRecord(row.payload) ?? {},
    status: row.status,
    batchId: row.batchId,
    broadcastId: row.broadcastId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toNotificationDelivery(row: PrismaNotificationDelivery): NotificationDelivery {
  return {
    id: row.id,
    notificationId: row.notificationId,
    providerId: row.providerId,
    status: row.status,
    retryOfDeliveryId: row.retryOfDeliveryId,
    sentAt: row.sentAt,
    deliveredAt: row.deliveredAt,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toNotificationRetry(row: PrismaNotificationRetry): NotificationRetry {
  return {
    id: row.id,
    notificationDeliveryId: row.notificationDeliveryId,
    attemptNumber: row.attemptNumber,
    backoffSeconds: row.backoffSeconds,
    nextEligibleAt: row.nextEligibleAt,
    createdAt: row.createdAt,
  };
}

export function toNotificationQueue(row: PrismaNotificationQueue): NotificationQueue {
  return {
    id: row.id,
    organizationId: row.organizationId,
    channelType: row.channelType,
    priority: row.priority,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toNotificationQueueEntry(
  row: PrismaNotificationQueueEntry,
): NotificationQueueEntry {
  return {
    id: row.id,
    notificationQueueId: row.notificationQueueId,
    notificationId: row.notificationId,
    triggerType: row.triggerType,
    scheduledFor: row.scheduledFor,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toNotificationPreference(
  row: PrismaNotificationPreference,
): NotificationPreference {
  return {
    id: row.id,
    recipientType: row.recipientType,
    recipientId: row.recipientId,
    eventCategory: row.eventCategory,
    channelType: row.channelType,
    isEnabled: row.isEnabled,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toNotificationChannel(row: PrismaNotificationChannel): NotificationChannel {
  return {
    id: row.id,
    organizationId: row.organizationId,
    channelType: row.channelType,
    rateLimitPerMinute: row.rateLimitPerMinute,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toProvider(row: PrismaProvider): Provider {
  return {
    id: row.id,
    organizationId: row.organizationId,
    channelId: row.channelId,
    providerType: row.providerType,
    configuration: asRecord(row.configuration) ?? {},
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCommunicationLogEntry(row: PrismaCommunicationLog): CommunicationLogEntry {
  return {
    id: row.id,
    organizationId: row.organizationId,
    notificationId: row.notificationId,
    notificationDeliveryId: row.notificationDeliveryId,
    eventType: row.eventType,
    details: asRecord(row.details),
    occurredAt: row.occurredAt,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}

export function toNotificationsAuditRecord(
  row: PrismaNotificationAuditLog,
): NotificationsAuditRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    occurredAt: row.occurredAt,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: asRecord(row.beforeState),
    afterState: asRecord(row.afterState),
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}
