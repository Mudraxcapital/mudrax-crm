// ============================================================================
// src/infra/jobs/handlers/notificationHandlers.ts
// ============================================================================

import {
  processNotificationQueue,
  retryNotificationDeliveries,
} from "@/modules/notifications";
import { JOB_TYPES, type JobHandler } from "../types";

const SYSTEM_ACTOR = { actorType: "SYSTEM" as const, actorId: null };

export const processNotificationQueueHandler: JobHandler = {
  type: JOB_TYPES.NOTIFICATIONS_PROCESS_QUEUE,
  periodic: true,
  async run(ctx) {
    const deliveries = await processNotificationQueue({
      organizationId: ctx.organizationId,
      actor: SYSTEM_ACTOR,
      correlationId: ctx.correlationId,
      input: { limit: 50 },
      now: ctx.now,
    });
    return { processed: deliveries.length };
  },
};

export const retryFailedNotificationsHandler: JobHandler = {
  type: JOB_TYPES.NOTIFICATIONS_RETRY_FAILED,
  periodic: true,
  async run(ctx) {
    const deliveries = await retryNotificationDeliveries({
      organizationId: ctx.organizationId,
      actor: SYSTEM_ACTOR,
      correlationId: ctx.correlationId,
      input: { limit: 50 },
      now: ctx.now,
    });
    return { processed: deliveries.length };
  },
};
