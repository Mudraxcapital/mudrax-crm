// Public API of the `notifications` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { NullNotificationProviderAdapter } from "@/integrations/notifications/null/NullNotificationProviderAdapter";
import { PrismaNotificationTemplateRepository } from "./infrastructure/repositories/PrismaNotificationTemplateRepository";
import { PrismaNotificationRepository } from "./infrastructure/repositories/PrismaNotificationRepository";
import { PrismaNotificationDeliveryRepository } from "./infrastructure/repositories/PrismaNotificationDeliveryRepository";
import { PrismaNotificationQueueRepository } from "./infrastructure/repositories/PrismaNotificationQueueRepository";
import { PrismaNotificationPreferenceRepository } from "./infrastructure/repositories/PrismaNotificationPreferenceRepository";
import { PrismaNotificationChannelRepository } from "./infrastructure/repositories/PrismaNotificationChannelRepository";
import { PrismaCommunicationLogRepository } from "./infrastructure/repositories/PrismaCommunicationLogRepository";
import { CustomersModuleLookupAdapter } from "./infrastructure/adapters/CustomersModuleLookupAdapter";
import { UsersModuleLookupAdapter } from "./infrastructure/adapters/UsersModuleLookupAdapter";

import { makeCreateNotificationTemplate } from "./application/use-cases/createNotificationTemplate";
import { makeUpdateNotificationTemplate } from "./application/use-cases/updateNotificationTemplate";
import { makeArchiveNotificationTemplate } from "./application/use-cases/archiveNotificationTemplate";
import { makeCreateTemplateVersion } from "./application/use-cases/createTemplateVersion";
import {
  makeGetNotificationTemplate,
  makeListNotificationTemplates,
  makeListTemplateVersions,
} from "./application/use-cases/getNotificationTemplate";
import { makeSendNotification } from "./application/use-cases/sendNotification";
import { makeProcessNotificationQueue } from "./application/use-cases/processNotificationQueue";
import { makeRetryNotificationDeliveries } from "./application/use-cases/retryNotificationDeliveries";
import {
  makeGetNotification,
  makeListNotifications,
} from "./application/use-cases/getNotification";
import { makeUpsertNotificationPreference } from "./application/use-cases/upsertNotificationPreference";
import {
  makeGetNotificationPreference,
  makeListNotificationPreferences,
} from "./application/use-cases/getNotificationPreference";
import { makeListNotificationHistory } from "./application/use-cases/listNotificationHistory";
import {
  makeCancelNotificationQueueEntry,
  makeListNotificationQueueEntries,
} from "./application/use-cases/getNotificationQueue";
import { makeGetNotificationsDashboard } from "./application/use-cases/getNotificationsDashboard";
import {
  makeEnsureSystemNotificationTemplates,
  SYSTEM_TEMPLATE_CODES,
  type SystemTemplateCode,
} from "./application/use-cases/ensureSystemTemplates";
import {
  NotificationNotFoundError,
  NotificationTemplateNotFoundError,
  DuplicateNotificationTemplateCodeError,
  NotificationTemplateVersionNotFoundError,
  NotificationTemplateNotActiveError,
  NotificationTemplateArchivedError,
  NoPublishedTemplateVersionError,
  NotificationImmutableError,
  InvalidNotificationStatusTransitionError,
  NotificationDeliveryNotFoundError,
  NotificationQueueNotFoundError,
  NotificationQueueEntryNotFoundError,
  NotificationPreferenceNotFoundError,
  NotificationSuppressedByPreferenceError,
  InvalidCustomerReferenceError,
  InvalidUserReferenceError,
  UnsupportedChannelTypeError,
  RetryExhaustedError,
  ProviderNotFoundError,
} from "./domain/errors/NotificationErrors";
import { toNotificationDeliveryDto } from "./application/dto/NotificationDeliveryDto";

export type {
  ChannelType,
  NotificationTemplate,
  NotificationTemplateStatus,
  SendableChannelType,
} from "./domain/entities/NotificationTemplate";
export {
  CHANNEL_TYPES,
  SENDABLE_CHANNEL_TYPES,
  NOTIFICATION_TEMPLATE_STATUSES,
  isSendableChannelType,
} from "./domain/entities/NotificationTemplate";
export type {
  NotificationTemplateVersion,
  TemplateVersionStatus,
} from "./domain/entities/NotificationTemplateVersion";
export { TEMPLATE_VERSION_STATUSES } from "./domain/entities/NotificationTemplateVersion";
export type {
  Notification,
  NotificationCategory,
  NotificationStatus,
  RecipientType,
} from "./domain/entities/Notification";
export {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_STATUSES,
  RECIPIENT_TYPES,
  PENDING_NOTIFICATION_STATUSES,
  SENT_NOTIFICATION_STATUSES,
} from "./domain/entities/Notification";
export type { DeliveryStatus, NotificationDelivery } from "./domain/entities/NotificationDelivery";
export { DELIVERY_STATUSES } from "./domain/entities/NotificationDelivery";
export type { NotificationRetry } from "./domain/entities/NotificationRetry";
export { DEFAULT_MAX_RETRY_ATTEMPTS } from "./domain/entities/NotificationRetry";
export type {
  NotificationQueue,
  NotificationQueueEntry,
  QueueEntryStatus,
  QueueStatus,
} from "./domain/entities/NotificationQueue";
export {
  QUEUE_ENTRY_STATUSES,
  PENDING_QUEUE_ENTRY_STATUSES,
  PROCESSING_QUEUE_ENTRY_STATUSES,
} from "./domain/entities/NotificationQueue";
export type { NotificationPreference } from "./domain/entities/NotificationPreference";
export type { CommunicationLogEntry } from "./domain/entities/CommunicationLogEntry";
export type {
  NotificationsActorType,
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "./domain/entities/NotificationsAuditRecord";
export { NOTIFICATIONS_ACTOR_TYPES } from "./domain/entities/NotificationsAuditRecord";

export {
  NotificationTemplateNotFoundError,
  DuplicateNotificationTemplateCodeError,
  NotificationTemplateVersionNotFoundError,
  NotificationTemplateNotActiveError,
  NotificationTemplateArchivedError,
  NoPublishedTemplateVersionError,
  NotificationNotFoundError,
  NotificationImmutableError,
  InvalidNotificationStatusTransitionError,
  NotificationDeliveryNotFoundError,
  NotificationQueueNotFoundError,
  NotificationQueueEntryNotFoundError,
  NotificationPreferenceNotFoundError,
  NotificationSuppressedByPreferenceError,
  InvalidCustomerReferenceError,
  InvalidUserReferenceError,
  UnsupportedChannelTypeError,
  RetryExhaustedError,
  ProviderNotFoundError,
};

export type {
  NotificationTemplateDto,
  NotificationTemplateVersionDto,
} from "./application/dto/NotificationTemplateDto";
export type { NotificationDto } from "./application/dto/NotificationDto";
export type {
  NotificationDeliveryDto,
  NotificationRetryDto,
} from "./application/dto/NotificationDeliveryDto";
export type {
  NotificationQueueDto,
  NotificationQueueEntryDto,
} from "./application/dto/NotificationQueueDto";
export type { NotificationPreferenceDto } from "./application/dto/NotificationPreferenceDto";
export type { CommunicationLogDto } from "./application/dto/CommunicationLogDto";
export type {
  ChannelBreakdownDto,
  NotificationsDashboardDto,
} from "./application/dto/NotificationsDashboardDto";

export {
  createNotificationTemplateSchema,
  updateNotificationTemplateSchema,
  createTemplateVersionSchema,
  sendNotificationSchema,
  upsertNotificationPreferenceSchema,
  processNotificationQueueSchema,
  retryNotificationDeliverySchema,
  type CreateNotificationTemplateInput,
  type UpdateNotificationTemplateInput,
  type CreateTemplateVersionInput,
  type SendNotificationInput,
  type UpsertNotificationPreferenceInput,
  type ProcessNotificationQueueInput,
  type RetryNotificationDeliveryInput,
} from "./application/validators/notificationSchemas";

const templateRepository = new PrismaNotificationTemplateRepository(prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const deliveryRepository = new PrismaNotificationDeliveryRepository(prisma);
const queueRepository = new PrismaNotificationQueueRepository(prisma);
const preferenceRepository = new PrismaNotificationPreferenceRepository(prisma);
const channelRepository = new PrismaNotificationChannelRepository(prisma);
const communicationLogRepository = new PrismaCommunicationLogRepository(prisma);

const userLookup = new UsersModuleLookupAdapter();
const customerLookup = new CustomersModuleLookupAdapter();
const notificationProvider = new NullNotificationProviderAdapter();

export const createNotificationTemplate = makeCreateNotificationTemplate(templateRepository);
export const updateNotificationTemplate = makeUpdateNotificationTemplate(templateRepository);
export const archiveNotificationTemplate = makeArchiveNotificationTemplate(templateRepository);
export const createTemplateVersion = makeCreateTemplateVersion(templateRepository);
export const getNotificationTemplate = makeGetNotificationTemplate(templateRepository);
export const listNotificationTemplates = makeListNotificationTemplates(templateRepository);
export const listTemplateVersions = makeListTemplateVersions(templateRepository);

export const processNotificationQueue = makeProcessNotificationQueue(
  notificationRepository,
  queueRepository,
  deliveryRepository,
  templateRepository,
  channelRepository,
  communicationLogRepository,
  notificationProvider,
);

export const sendNotification = makeSendNotification(
  templateRepository,
  notificationRepository,
  queueRepository,
  preferenceRepository,
  communicationLogRepository,
  userLookup,
  customerLookup,
  processNotificationQueue,
);

export const retryNotificationDeliveries = makeRetryNotificationDeliveries(
  notificationRepository,
  deliveryRepository,
  templateRepository,
  channelRepository,
  communicationLogRepository,
  notificationProvider,
);

export const getNotification = makeGetNotification(notificationRepository, templateRepository);
export const listNotifications = makeListNotifications(notificationRepository, templateRepository);

export async function listNotificationDeliveries(organizationId: string, notificationId: string) {
  const notification = await notificationRepository.findById(notificationId);
  if (!notification || notification.organizationId !== organizationId) {
    throw new NotificationNotFoundError(notificationId);
  }
  const deliveries = await deliveryRepository.listByNotification(notificationId);
  return deliveries.map(toNotificationDeliveryDto);
}

export const upsertNotificationPreference = makeUpsertNotificationPreference(
  preferenceRepository,
  userLookup,
  customerLookup,
);
export const getNotificationPreference = makeGetNotificationPreference(preferenceRepository);
export const listNotificationPreferences = makeListNotificationPreferences(preferenceRepository);

export const listNotificationHistory = makeListNotificationHistory(
  communicationLogRepository,
  notificationRepository,
);

export const listNotificationQueueEntries = makeListNotificationQueueEntries(queueRepository);
export const cancelNotificationQueueEntry = makeCancelNotificationQueueEntry(queueRepository);

export const getNotificationsDashboard = makeGetNotificationsDashboard(
  notificationRepository,
  templateRepository,
);

export const ensureSystemNotificationTemplates =
  makeEnsureSystemNotificationTemplates(templateRepository);
export { SYSTEM_TEMPLATE_CODES };
export type { SystemTemplateCode };
