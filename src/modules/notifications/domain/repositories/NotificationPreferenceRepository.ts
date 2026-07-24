// ============================================================================
// src/modules/notifications/domain/repositories/NotificationPreferenceRepository.ts
// ============================================================================

import type { ChannelType } from "../entities/NotificationTemplate";
import type { RecipientType } from "../entities/Notification";
import type { NotificationPreference } from "../entities/NotificationPreference";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../entities/NotificationsAuditRecord";

export interface UpsertNotificationPreferenceData {
  recipientType: RecipientType;
  recipientId: string;
  eventCategory: string;
  channelType?: ChannelType | null;
  isEnabled: boolean;
}

export interface ListNotificationPreferencesFilter {
  recipientType?: RecipientType;
  recipientId?: string;
  eventCategory?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationPreferenceRepository {
  findById(id: string): Promise<NotificationPreference | null>;
  findForRecipient(
    recipientType: RecipientType,
    recipientId: string,
    eventCategory: string,
    channelType?: ChannelType | null,
  ): Promise<NotificationPreference | null>;
  list(filter?: ListNotificationPreferencesFilter): Promise<NotificationPreference[]>;

  upsertWithAudit(
    data: UpsertNotificationPreferenceData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationPreference>;

  listAuditLog(preferenceId: string): Promise<NotificationsAuditRecord[]>;
}
