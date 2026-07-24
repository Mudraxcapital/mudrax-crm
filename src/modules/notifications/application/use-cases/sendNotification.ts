// ============================================================================
// src/modules/notifications/application/use-cases/sendNotification.ts
//
// Ad-hoc Notification send: validates Template + recipient, applies
// Preference suppression for Operational/Marketing, creates the
// Notification intent, enqueues a Queue Entry, and optionally processes
// the queue immediately through the Null Notification Provider.
// ============================================================================

import type { NotificationTemplateRepository } from "../../domain/repositories/NotificationTemplateRepository";
import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import type { NotificationQueueRepository } from "../../domain/repositories/NotificationQueueRepository";
import type { NotificationPreferenceRepository } from "../../domain/repositories/NotificationPreferenceRepository";
import type { CommunicationLogRepository } from "../../domain/repositories/CommunicationLogRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";
import { isPreferenceApplicableCategory } from "../../domain/entities/Notification";
import { isSendableChannelType } from "../../domain/entities/NotificationTemplate";
import { DEFAULT_MAX_RETRY_ATTEMPTS } from "../../domain/entities/NotificationRetry";
import {
  InvalidCustomerReferenceError,
  InvalidUserReferenceError,
  NoPublishedTemplateVersionError,
  NotificationSuppressedByPreferenceError,
  NotificationTemplateNotActiveError,
  NotificationTemplateNotFoundError,
  UnsupportedChannelTypeError,
} from "../../domain/errors/NotificationErrors";
import type { CustomerLookupPort } from "../ports/CustomerLookupPort";
import type { UserLookupPort } from "../ports/UserLookupPort";
import type { SendNotificationInput } from "../validators/notificationSchemas";
import { toNotificationDto, type NotificationDto } from "../dto/NotificationDto";
import type { ProcessNotificationQueue } from "./processNotificationQueue";

export interface SendNotificationCommand {
  organizationId: string;
  input: SendNotificationInput;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
}

export function makeSendNotification(
  templateRepository: NotificationTemplateRepository,
  notificationRepository: NotificationRepository,
  queueRepository: NotificationQueueRepository,
  preferenceRepository: NotificationPreferenceRepository,
  communicationLogRepository: CommunicationLogRepository,
  userLookup: UserLookupPort,
  customerLookup: CustomerLookupPort,
  processQueue: ProcessNotificationQueue,
) {
  return async function sendNotification(
    command: SendNotificationCommand,
  ): Promise<NotificationDto> {
    const { organizationId, input, actor, correlationId } = command;

    const template = await templateRepository.findById(input.templateId);
    if (!template || template.organizationId !== organizationId) {
      throw new NotificationTemplateNotFoundError(input.templateId);
    }
    if (template.status !== "ACTIVE") {
      throw new NotificationTemplateNotActiveError(template.id);
    }
    if (!isSendableChannelType(template.channelType)) {
      throw new UnsupportedChannelTypeError(template.channelType);
    }

    const publishedVersion = await templateRepository.findLatestPublishedVersion(template.id);
    if (!publishedVersion) {
      throw new NoPublishedTemplateVersionError(template.id);
    }

    if (input.recipientType === "USER") {
      const user = await userLookup.findById(input.recipientId);
      if (!user || user.organizationId !== organizationId || user.status !== "ACTIVE") {
        throw new InvalidUserReferenceError(input.recipientId);
      }
    } else {
      const customer = await customerLookup.findById(input.recipientId);
      if (!customer || customer.organizationId !== organizationId) {
        throw new InvalidCustomerReferenceError(input.recipientId);
      }
    }

    const eventCategory = input.eventCategory ?? input.category;
    if (isPreferenceApplicableCategory(input.category)) {
      const preference =
        (await preferenceRepository.findForRecipient(
          input.recipientType,
          input.recipientId,
          eventCategory,
          template.channelType,
        )) ??
        (await preferenceRepository.findForRecipient(
          input.recipientType,
          input.recipientId,
          eventCategory,
          null,
        ));
      if (preference && !preference.isEnabled && preference.status !== "INACTIVE") {
        throw new NotificationSuppressedByPreferenceError(eventCategory);
      }
    }

    const maxRetryAttempts = input.maxRetryAttempts ?? DEFAULT_MAX_RETRY_ATTEMPTS;
    const payload: Record<string, unknown> = {
      ...(input.payload ?? {}),
      _meta: {
        eventCategory,
        maxRetryAttempts,
        recipientAddress:
          input.recipientAddress ?? `${input.recipientType.toLowerCase()}:${input.recipientId}`,
        channelType: template.channelType,
      },
    };

    let notification = await notificationRepository.createWithAudit(
      {
        organizationId,
        category: input.category,
        templateId: template.id,
        templateVersionId: publishedVersion.id,
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        payload,
        status: "CREATED",
      },
      actor,
      correlationId,
    );

    notification = await notificationRepository.updateStatusWithAudit(
      notification.id,
      "RESOLVED",
      actor,
      correlationId,
    );
    notification = await notificationRepository.updateStatusWithAudit(
      notification.id,
      "QUEUED",
      actor,
      correlationId,
    );

    await queueRepository.enqueueWithAudit(
      {
        organizationId,
        channelType: template.channelType,
        notificationId: notification.id,
        triggerType: input.scheduledFor ? "SCHEDULED" : "IMMEDIATE",
        scheduledFor: input.scheduledFor ?? null,
      },
      actor,
      correlationId,
    );

    await communicationLogRepository.append({
      organizationId,
      notificationId: notification.id,
      eventType: "NotificationQueued",
      details: {
        templateId: template.id,
        templateVersionId: publishedVersion.id,
        channelType: template.channelType,
        category: input.category,
      },
    });

    if (input.processImmediately !== false && !input.scheduledFor) {
      await processQueue({
        organizationId,
        input: { limit: 1 },
        actor,
        correlationId,
        notificationId: notification.id,
      });
      const refreshed = await notificationRepository.findById(notification.id);
      if (refreshed) notification = refreshed;
    }

    return toNotificationDto(notification, {
      templatesById: new Map([[template.id, template]]),
    });
  };
}
