// ============================================================================
// src/infra/jobs/handlers/followUpHandlers.ts
// ============================================================================

import {
  listFollowUpReminders,
  processFollowUpLifecycle,
  type FollowUpNotificationIntent,
} from "@/modules/follow-ups";
import {
  ensureSystemNotificationTemplates,
  sendNotification,
  SYSTEM_TEMPLATE_CODES,
} from "@/modules/notifications";
import { claimJobRun, completeJobRun, failJobRun } from "../jobRunStore";
import { resolveDayBounds } from "../timezone";
import { JOB_TYPES, type JobHandler, type JobHandlerContext } from "../types";

const SYSTEM_NOTIFICATION_ACTOR = { actorType: "SYSTEM" as const, actorId: null };

function templateCodeFor(kind: FollowUpNotificationIntent["kind"]) {
  switch (kind) {
    case "REMINDER":
      return SYSTEM_TEMPLATE_CODES.FOLLOW_UP_REMINDER;
    case "ESCALATION_TEAM_LEAD":
      return SYSTEM_TEMPLATE_CODES.FOLLOW_UP_ESCALATION_TL;
    case "ESCALATION_MANAGER":
      return SYSTEM_TEMPLATE_CODES.FOLLOW_UP_ESCALATION_MANAGER;
    case "ESCALATION_ADMIN":
      return SYSTEM_TEMPLATE_CODES.FOLLOW_UP_ESCALATION_ADMIN;
  }
}

async function dispatchNotification(
  ctx: JobHandlerContext,
  intent: FollowUpNotificationIntent,
  jobType: string,
): Promise<boolean> {
  const idempotencyKey = `${intent.kind.toLowerCase()}:${intent.followUpId}:${intent.recipientUserId}:${intent.dateKey}`;
  const run = await claimJobRun({
    jobType,
    idempotencyKey,
    organizationId: ctx.organizationId,
    workerId: ctx.workerId,
    correlationId: ctx.correlationId,
    now: ctx.now,
  });
  if (!run) return false;

  try {
    const templates = await ensureSystemNotificationTemplates(ctx.organizationId);
    const templateId = templates[templateCodeFor(intent.kind)];
    await sendNotification({
      organizationId: ctx.organizationId,
      actor: SYSTEM_NOTIFICATION_ACTOR,
      correlationId: ctx.correlationId,
      input: {
        templateId,
        category: "OPERATIONAL",
        recipientType: "USER",
        recipientId: intent.recipientUserId,
        eventCategory: `follow_up.${intent.kind.toLowerCase()}`,
        payload: {
          followUpId: intent.followUpId,
          leadId: intent.leadId,
          triggerType: intent.triggerType,
          scheduledFor: intent.scheduledFor,
        },
        processImmediately: true,
        maxRetryAttempts: 3,
      },
    });
    await completeJobRun(run.id, { followUpId: intent.followUpId }, ctx.now);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failJobRun(run.id, message, run.maxAttempts, run.attempt, ctx.now);
    throw error;
  }
}

export const followUpLifecycleHandler: JobHandler = {
  type: JOB_TYPES.FOLLOW_UP_LIFECYCLE,
  periodic: true,
  async run(ctx) {
    const day = resolveDayBounds(ctx.now, ctx.timeZone);
    const result = await processFollowUpLifecycle({
      organizationId: ctx.organizationId,
      day,
      now: ctx.now,
      correlationId: ctx.correlationId,
    });

    let notified = 0;
    for (const intent of result.notifications) {
      const jobType =
        intent.kind === "REMINDER"
          ? JOB_TYPES.FOLLOW_UP_REMINDER
          : JOB_TYPES.FOLLOW_UP_ESCALATION_NOTIFY;
      const ok = await dispatchNotification(ctx, intent, jobType);
      if (ok) notified += 1;
    }

    return {
      processed:
        result.markedDue.length +
        result.markedMissed.length +
        result.escalated.length +
        notified,
      details: {
        markedDue: result.markedDue.length,
        markedMissed: result.markedMissed.length,
        escalated: result.escalated.length,
        notifications: notified,
      },
    };
  },
};

export const followUpReminderHandler: JobHandler = {
  type: JOB_TYPES.FOLLOW_UP_REMINDER,
  periodic: true,
  async run(ctx) {
    const day = resolveDayBounds(ctx.now, ctx.timeZone);
    const reminders = await listFollowUpReminders({
      organizationId: ctx.organizationId,
      day,
      now: ctx.now,
    });

    let sent = 0;
    for (const intent of reminders) {
      const ok = await dispatchNotification(ctx, intent, JOB_TYPES.FOLLOW_UP_REMINDER);
      if (ok) sent += 1;
    }

    return { processed: sent, details: { candidates: reminders.length, sent } };
  },
};
