import type { NotificationQueueRepository } from "../../domain/repositories/NotificationQueueRepository";
import type { ListQueueEntriesFilter } from "../../domain/repositories/NotificationQueueRepository";
import type { NotificationsAuditActor } from "../../domain/entities/NotificationsAuditRecord";
import { NotificationQueueEntryNotFoundError } from "../../domain/errors/NotificationErrors";
import {
  toNotificationQueueEntryDto,
  type NotificationQueueEntryDto,
} from "../dto/NotificationQueueDto";

export function makeListNotificationQueueEntries(repository: NotificationQueueRepository) {
  return async function listNotificationQueueEntries(
    organizationId: string,
    filter?: ListQueueEntriesFilter,
  ): Promise<NotificationQueueEntryDto[]> {
    const entries = await repository.listEntries(organizationId, filter);
    return entries.map(toNotificationQueueEntryDto);
  };
}

export interface CancelQueueEntryCommand {
  organizationId: string;
  entryId: string;
  actor: NotificationsAuditActor;
  correlationId?: string | null;
}

export function makeCancelNotificationQueueEntry(repository: NotificationQueueRepository) {
  return async function cancelNotificationQueueEntry(
    command: CancelQueueEntryCommand,
  ): Promise<NotificationQueueEntryDto> {
    const { organizationId, entryId, actor, correlationId } = command;
    const entry = await repository.findEntryById(entryId);
    if (!entry) {
      throw new NotificationQueueEntryNotFoundError(entryId);
    }

    const cancelled = await repository.updateEntryStatusWithAudit(
      entryId,
      "CANCELLED",
      organizationId,
      actor,
      correlationId,
    );
    return toNotificationQueueEntryDto(cancelled);
  };
}
