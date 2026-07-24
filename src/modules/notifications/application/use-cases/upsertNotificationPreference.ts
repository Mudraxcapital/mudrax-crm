import type { NotificationPreferenceRepository } from "../../domain/repositories/NotificationPreferenceRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";
import {
  InvalidCustomerReferenceError,
  InvalidUserReferenceError,
} from "../../domain/errors/NotificationErrors";
import type { CustomerLookupPort } from "../ports/CustomerLookupPort";
import type { UserLookupPort } from "../ports/UserLookupPort";
import type { UpsertNotificationPreferenceInput } from "../validators/notificationSchemas";
import {
  toNotificationPreferenceDto,
  type NotificationPreferenceDto,
} from "../dto/NotificationPreferenceDto";

export interface UpsertNotificationPreferenceCommand {
  organizationId: string;
  input: UpsertNotificationPreferenceInput;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
}

export function makeUpsertNotificationPreference(
  repository: NotificationPreferenceRepository,
  userLookup: UserLookupPort,
  customerLookup: CustomerLookupPort,
) {
  return async function upsertNotificationPreference(
    command: UpsertNotificationPreferenceCommand,
  ): Promise<NotificationPreferenceDto> {
    const { organizationId, input, actor, correlationId } = command;

    if (input.recipientType === "USER") {
      const user = await userLookup.findById(input.recipientId);
      if (!user || user.organizationId !== organizationId) {
        throw new InvalidUserReferenceError(input.recipientId);
      }
    } else {
      const customer = await customerLookup.findById(input.recipientId);
      if (!customer || customer.organizationId !== organizationId) {
        throw new InvalidCustomerReferenceError(input.recipientId);
      }
    }

    const preference = await repository.upsertWithAudit(
      {
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        eventCategory: input.eventCategory,
        channelType: input.channelType ?? null,
        isEnabled: input.isEnabled,
      },
      organizationId,
      actor,
      correlationId,
    );

    return toNotificationPreferenceDto(preference);
  };
}
