import type { NotificationPreferenceRepository } from "../../domain/repositories/NotificationPreferenceRepository";
import type { ListNotificationPreferencesFilter } from "../../domain/repositories/NotificationPreferenceRepository";
import { NotificationPreferenceNotFoundError } from "../../domain/errors/NotificationErrors";
import {
  toNotificationPreferenceDto,
  type NotificationPreferenceDto,
} from "../dto/NotificationPreferenceDto";

export function makeGetNotificationPreference(repository: NotificationPreferenceRepository) {
  return async function getNotificationPreference(
    preferenceId: string,
  ): Promise<NotificationPreferenceDto> {
    const preference = await repository.findById(preferenceId);
    if (!preference) {
      throw new NotificationPreferenceNotFoundError(preferenceId);
    }
    return toNotificationPreferenceDto(preference);
  };
}

export function makeListNotificationPreferences(repository: NotificationPreferenceRepository) {
  return async function listNotificationPreferences(
    filter?: ListNotificationPreferencesFilter,
  ): Promise<NotificationPreferenceDto[]> {
    const preferences = await repository.list(filter);
    return preferences.map(toNotificationPreferenceDto);
  };
}
