// ============================================================================
// src/modules/notifications/application/use-cases/processNotificationQueue.ts
//
// Dequeues pending Queue Entries, creates a Notification Delivery, invokes
// the NotificationProviderPort (Null today), updates Delivery/Notification
// status, appends Communication Log history, and schedules retries on
// failure.
// ============================================================================

import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import type { NotificationQueueRepository } from "../../domain/repositories/NotificationQueueRepository";
import type { NotificationDeliveryRepository } from "../../domain/repositories/NotificationDeliveryRepository";
import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationChannelRepository } from "../../domain/repositories/NotificationChannelRepository";
import type { CommunicationLogRepository } from "../../domain/repositories/CommunicationLogRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";
import { isSendableChannelType } from "../../domain/entities/NotificationTemplate";
import {
  computeBackoffSeconds,
  DEFAULT_MAX_RETRY_ATTEMPTS,
} from "../../domain/entities/NotificationRetry";
import {
  NotificationNotFoundError,
  ProviderNotFoundError,
  UnsupportedChannelTypeError,
} from "../../domain/errors/NotificationErrors";
import type { NotificationProviderPort } from "../ports/NotificationProviderPort";
import type { ProcessNotificationQueueInput } from "../validators/notificationSchemas";
import {
  toNotificationDeliveryDto,
  type NotificationDeliveryDto,
} from "../dto/NotificationDeliveryDto";
import { renderTemplateString } from "./renderTemplate";

export interface ProcessNotificationQueueCommand {
  organizationId: string;
  input: ProcessNotificationQueueInput;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
  notificationId?: string;
  now?: Date;
}

export type ProcessNotificationQueue = (
  command: ProcessNotificationQueueCommand,
) => Promise<NotificationDeliveryDto[]>;

function readMeta(payload: Record<string, unknown>): {
  maxRetryAttempts: number;
  recipientAddress: string;
} {
  const meta = (payload._meta ?? {}) as Record<string, unknown>;
  return {
    maxRetryAttempts:
      typeof meta.maxRetryAttempts === "number"
        ? meta.maxRetryAttempts
        : DEFAULT_MAX_RETRY_ATTEMPTS,
    recipientAddress: typeof meta.recipientAddress === "string" ? meta.recipientAddress : "unknown",
  };
}

export function makeProcessNotificationQueue(
  notificationRepository: NotificationRepository,
  queueRepository: NotificationQueueRepository,
  deliveryRepository: NotificationDeliveryRepository,
  templateRepository: NotificationTemplateRepository,
  channelRepository: NotificationChannelRepository,
  communicationLogRepository: CommunicationLogRepository,
  provider: NotificationProviderPort,
): ProcessNotificationQueue {
  return async function processNotificationQueue(
    command: ProcessNotificationQueueCommand,
  ): Promise<NotificationDeliveryDto[]> {
    const { organizationId, input, actor, correlationId } = command;
    const now = command.now ?? new Date();

    let entries = await queueRepository.listPendingEntries(organizationId, input.limit ?? 25, now);
    if (command.notificationId) {
      entries = entries.filter((entry) => entry.notificationId === command.notificationId);
    }

    const results: NotificationDeliveryDto[] = [];

    for (const entry of entries) {
      const notification = await notificationRepository.findById(entry.notificationId);
      if (!notification || notification.organizationId !== organizationId) {
        throw new NotificationNotFoundError(entry.notificationId);
      }

      const template = await templateRepository.findById(notification.templateId);
      if (!template || !isSendableChannelType(template.channelType)) {
        throw new UnsupportedChannelTypeError(template?.channelType ?? "UNKNOWN");
      }

      const version = await templateRepository.findVersionById(notification.templateVersionId);
      const { provider: activeProvider } = await channelRepository.getOrCreateWithNullProvider(
        organizationId,
        template.channelType,
      );
      if (!activeProvider) {
        throw new ProviderNotFoundError(template.channelType);
      }

      await queueRepository.updateEntryStatusWithAudit(
        entry.id,
        "DEQUEUED",
        organizationId,
        actor,
        correlationId,
      );

      if (notification.status === "QUEUED") {
        await notificationRepository.updateStatusWithAudit(
          notification.id,
          "IN_PROGRESS",
          actor,
          correlationId,
        );
      }

      let delivery = await deliveryRepository.createWithAudit(
        {
          notificationId: notification.id,
          providerId: activeProvider.id,
          status: "QUEUED",
        },
        organizationId,
        actor,
        correlationId,
      );

      delivery = await deliveryRepository.updateStatusWithAudit(
        delivery.id,
        { status: "SENDING" },
        organizationId,
        actor,
        correlationId,
      );

      const { recipientAddress, maxRetryAttempts } = readMeta(notification.payload);
      const subject = version?.subject
        ? renderTemplateString(version.subject, notification.payload)
        : null;
      const body = renderTemplateString(version?.body ?? "", notification.payload);

      const sendResult = await provider.send({
        organizationId,
        channelType: template.channelType,
        recipientAddress,
        subject,
        body,
        payload: notification.payload,
      });

      if (sendResult.accepted) {
        delivery = await deliveryRepository.updateStatusWithAudit(
          delivery.id,
          {
            status: "SENT",
            sentAt: now,
            deliveredAt: now,
            failureReason: null,
          },
          organizationId,
          actor,
          correlationId,
        );

        await notificationRepository.updateStatusWithAudit(
          notification.id,
          "DELIVERED",
          actor,
          correlationId,
        );
        await queueRepository.updateEntryStatusWithAudit(
          entry.id,
          "RESOLVED",
          organizationId,
          actor,
          correlationId,
        );

        await communicationLogRepository.append({
          organizationId,
          notificationId: notification.id,
          notificationDeliveryId: delivery.id,
          eventType: "NotificationDeliverySent",
          details: {
            providerMessageId: sendResult.providerMessageId,
            channelType: template.channelType,
          },
        });
      } else {
        delivery = await deliveryRepository.updateStatusWithAudit(
          delivery.id,
          {
            status: "FAILED",
            failureReason: sendResult.failureReason ?? "Provider rejected the send.",
          },
          organizationId,
          actor,
          correlationId,
        );

        const attemptNumber = (await deliveryRepository.countRetryChain(delivery.id)) + 1;
        if (attemptNumber <= maxRetryAttempts) {
          const backoffSeconds = computeBackoffSeconds(attemptNumber);
          await deliveryRepository.createRetry({
            notificationDeliveryId: delivery.id,
            attemptNumber,
            backoffSeconds,
            nextEligibleAt: new Date(now.getTime() + backoffSeconds * 1000),
          });
          await queueRepository.updateEntryStatusWithAudit(
            entry.id,
            "ENQUEUED",
            organizationId,
            actor,
            correlationId,
          );
        } else {
          await notificationRepository.updateStatusWithAudit(
            notification.id,
            "FAILED",
            actor,
            correlationId,
          );
          await queueRepository.updateEntryStatusWithAudit(
            entry.id,
            "RESOLVED",
            organizationId,
            actor,
            correlationId,
          );
        }

        await communicationLogRepository.append({
          organizationId,
          notificationId: notification.id,
          notificationDeliveryId: delivery.id,
          eventType: "NotificationDeliveryFailed",
          details: {
            failureReason: delivery.failureReason,
            attemptNumber,
            maxRetryAttempts,
          },
        });
      }

      results.push(toNotificationDeliveryDto(delivery));
    }

    return results;
  };
}
