// ============================================================================
// src/modules/notifications/domain/errors/NotificationErrors.ts
// ============================================================================

export class NotificationTemplateNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification Template ${id} was not found.`);
    this.name = "NotificationTemplateNotFoundError";
  }
}

export class DuplicateNotificationTemplateCodeError extends Error {
  constructor(code: string) {
    super(`A Notification Template with code "${code}" already exists in this Organization.`);
    this.name = "DuplicateNotificationTemplateCodeError";
  }
}

export class NotificationTemplateVersionNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification Template Version ${id} was not found.`);
    this.name = "NotificationTemplateVersionNotFoundError";
  }
}

export class NotificationTemplateNotActiveError extends Error {
  constructor(id: string) {
    super(`Notification Template ${id} is not ACTIVE and cannot be used to send.`);
    this.name = "NotificationTemplateNotActiveError";
  }
}

export class NotificationTemplateArchivedError extends Error {
  constructor(id: string) {
    super(`Notification Template ${id} is ARCHIVED and cannot be updated.`);
    this.name = "NotificationTemplateArchivedError";
  }
}

export class NoPublishedTemplateVersionError extends Error {
  constructor(templateId: string) {
    super(`Notification Template ${templateId} has no PUBLISHED Version to send.`);
    this.name = "NoPublishedTemplateVersionError";
  }
}

export class NotificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification ${id} was not found.`);
    this.name = "NotificationNotFoundError";
  }
}

export class NotificationImmutableError extends Error {
  constructor(id: string) {
    super(`Notification ${id} is immutable once Queued; create a new Notification instead.`);
    this.name = "NotificationImmutableError";
  }
}

export class InvalidNotificationStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Notification cannot transition from ${from} to ${to}.`);
    this.name = "InvalidNotificationStatusTransitionError";
  }
}

export class NotificationDeliveryNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification Delivery ${id} was not found.`);
    this.name = "NotificationDeliveryNotFoundError";
  }
}

export class NotificationQueueNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification Queue ${id} was not found.`);
    this.name = "NotificationQueueNotFoundError";
  }
}

export class NotificationQueueEntryNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification Queue Entry ${id} was not found.`);
    this.name = "NotificationQueueEntryNotFoundError";
  }
}

export class NotificationPreferenceNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification Preference ${id} was not found.`);
    this.name = "NotificationPreferenceNotFoundError";
  }
}

export class NotificationSuppressedByPreferenceError extends Error {
  constructor(eventCategory: string) {
    super(
      `Notification for event category "${eventCategory}" was suppressed by the recipient's Preference.`,
    );
    this.name = "NotificationSuppressedByPreferenceError";
  }
}

export class InvalidCustomerReferenceError extends Error {
  constructor(customerId: string) {
    super(`Customer ${customerId} was not found in this Organization.`);
    this.name = "InvalidCustomerReferenceError";
  }
}

export class InvalidUserReferenceError extends Error {
  constructor(userId: string) {
    super(`User ${userId} was not found in this Organization.`);
    this.name = "InvalidUserReferenceError";
  }
}

export class UnsupportedChannelTypeError extends Error {
  constructor(channelType: string) {
    super(
      `Channel type "${channelType}" is not supported by this Notifications implementation (EMAIL, SMS, WhatsApp only).`,
    );
    this.name = "UnsupportedChannelTypeError";
  }
}

export class RetryExhaustedError extends Error {
  constructor(deliveryId: string) {
    super(`Retry attempts for Notification Delivery ${deliveryId} have been exhausted.`);
    this.name = "RetryExhaustedError";
  }
}

export class ProviderNotFoundError extends Error {
  constructor(channelType: string) {
    super(`No active Provider is configured for channel ${channelType} in this Organization.`);
    this.name = "ProviderNotFoundError";
  }
}
