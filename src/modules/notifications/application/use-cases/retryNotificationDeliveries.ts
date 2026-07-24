// ============================================================================
// src/modules/notifications/application/use-cases/retryNotificationDeliveries.ts
//
// Retry Handling: a retry always creates a new Notification Delivery linked
// by retryOfDeliveryId — never mutates the failed Delivery (ADR 0008).
// ============================================================================

import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
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
  NotificationDeliveryNotFoundError,
  NotificationNotFoundError,
  RetryExhaustedError,
  UnsupportedChannelTypeError,
} from "../../domain/errors/NotificationErrors";
import type { NotificationProviderPort } from "../ports/NotificationProviderPort";
import type { RetryNotificationDeliveryInput } from "../validators/notificationSchemas";
import {
  toNotificationDeliveryDto,
  type NotificationDeliveryDto,
} from "../dto/NotificationDeliveryDto";
import { renderTemplateString } from "./renderTemplate";

export interface RetryNotificationDeliveriesCommand {
  organizationId: string;
  input: RetryNotificationDeliveryInput;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
  now?: Date;
}

export function makeRetryNotificationDeliveries(
  notificationRepository: NotificationRepository,
  deliveryRepository: NotificationDeliveryRepository,
  templateRepository: NotificationTemplateRepository,
  channelRepository: NotificationChannelRepository,
  communicationLogRepository: CommunicationLogRepository,
  provider: NotificationProviderPort,
) {
  return async function retryNotificationDeliveries(
    command: RetryNotificationDeliveriesCommand,
  ): Promise<NotificationDeliveryDto[]> {
    const { organizationId, input, actor, correlationId } = command;
    const now = command.now ?? new Date();

    let failedDeliveries = await deliveryRepository.listFailedEligibleForRetry(
      organizationId,
      now,
      input.limit ?? 25,
    );
    if (input.deliveryId) {
      const single = await deliveryRepository.findById(input.deliveryId);
      if (!single) throw new NotificationDeliveryNotFoundError(input.deliveryId);
      failedDeliveries = [single];
    }

    const results: NotificationDeliveryDto[] = [];

    for (const failed of failedDeliveries) {
      const notification = await notificationRepository.findById(failed.notificationId);
      if (!notification || notification.organizationId !== organizationId) {
        throw new NotificationNotFoundError(failed.notificationId);
      }

      const meta = (notification.payload._meta ?? {}) as Record<string, unknown>;
      const maxRetryAttempts =
        typeof meta.maxRetryAttempts === "number"
          ? meta.maxRetryAttempts
          : DEFAULT_MAX_RETRY_ATTEMPTS;
      const attemptNumber = (await deliveryRepository.countRetryChain(failed.id)) + 1;
      if (attemptNumber > maxRetryAttempts) {
        if (input.deliveryId) {
          throw new RetryExhaustedError(failed.id);
        }
        continue;
      }

      const template = await templateRepository.findById(notification.templateId);
      if (!template || !isSendableChannelType(template.channelType)) {
        throw new UnsupportedChannelTypeError(template?.channelType ?? "UNKNOWN");
      }

      const { provider: activeProvider } = await channelRepository.getOrCreateWithNullProvider(
        organizationId,
        template.channelType,
      );
      const version = await templateRepository.findVersionById(notification.templateVersionId);

      let delivery = await deliveryRepository.createWithAudit(
        {
          notificationId: notification.id,
          providerId: activeProvider.id,
          status: "QUEUED",
          retryOfDeliveryId: failed.id,
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

      const recipientAddress =
        typeof meta.recipientAddress === "string"
          ? meta.recipientAddress
          : `${notification.recipientType.toLowerCase()}:${notification.recipientId}`;

      const sendResult = await provider.send({
        organizationId,
        channelType: template.channelType,
        recipientAddress,
        subject: version?.subject
          ? renderTemplateString(version.subject, notification.payload)
          : null,
        body: renderTemplateString(version?.body ?? "", notification.payload),
        payload: notification.payload,
      });

      if (sendResult.accepted) {
        delivery = await deliveryRepository.updateStatusWithAudit(
          delivery.id,
          { status: "SENT", sentAt: now, deliveredAt: now },
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
        await communicationLogRepository.append({
          organizationId,
          notificationId: notification.id,
          notificationDeliveryId: delivery.id,
          eventType: "NotificationDeliveryRetrySent",
          details: {
            retryOfDeliveryId: failed.id,
            attemptNumber,
            providerMessageId: sendResult.providerMessageId,
          },
        });
      } else {
        delivery = await deliveryRepository.updateStatusWithAudit(
          delivery.id,
          {
            status: "FAILED",
            failureReason: sendResult.failureReason ?? "Provider rejected the retry.",
          },
          organizationId,
          actor,
          correlationId,
        );

        if (attemptNumber < maxRetryAttempts) {
          const backoffSeconds = computeBackoffSeconds(attemptNumber + 1);
          await deliveryRepository.createRetry({
            notificationDeliveryId: delivery.id,
            attemptNumber: attemptNumber + 1,
            backoffSeconds,
            nextEligibleAt: new Date(now.getTime() + backoffSeconds * 1000),
          });
        } else {
          await notificationRepository.updateStatusWithAudit(
            notification.id,
            "FAILED",
            actor,
            correlationId,
          );
        }

        await communicationLogRepository.append({
          organizationId,
          notificationId: notification.id,
          notificationDeliveryId: delivery.id,
          eventType: "NotificationDeliveryRetryFailed",
          details: {
            retryOfDeliveryId: failed.id,
            attemptNumber,
            failureReason: delivery.failureReason,
          },
        });
      }

      results.push(toNotificationDeliveryDto(delivery));
    }

    return results;
  };
}
