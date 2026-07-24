import type { NotificationPreference } from "../../domain/entities/NotificationPreference";

export interface NotificationPreferenceDto {
  id: string;
  recipientType: NotificationPreference["recipientType"];
  recipientId: string;
  eventCategory: string;
  channelType: NotificationPreference["channelType"];
  isEnabled: boolean;
  status: NotificationPreference["status"];
  createdAt: string;
  updatedAt: string;
}

export function toNotificationPreferenceDto(
  preference: NotificationPreference,
): NotificationPreferenceDto {
  return {
    id: preference.id,
    recipientType: preference.recipientType,
    recipientId: preference.recipientId,
    eventCategory: preference.eventCategory,
    channelType: preference.channelType,
    isEnabled: preference.isEnabled,
    status: preference.status,
    createdAt: preference.createdAt.toISOString(),
    updatedAt: preference.updatedAt.toISOString(),
  };
}
