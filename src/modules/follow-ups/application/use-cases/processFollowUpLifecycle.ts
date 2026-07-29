// ============================================================================
// src/modules/follow-ups/application/use-cases/processFollowUpLifecycle.ts
//
// Background-job facing use-cases: mark due, mark overdue/missed, escalate
// to Team Lead / Manager. Business rules mirror BRD §11 and follow-ups.md;
// timing is timezone-aware via the caller-supplied day bounds.
// ============================================================================

import type { FollowUpRepository } from "../../domain/repositories/FollowUpRepository";
import type { FollowUp } from "../../domain/entities/FollowUp";
import type { FollowUpAuditActor } from "../../domain/entities/FollowUpAuditRecord";
import type { UserLookupPort } from "../ports/UserLookupPort";
import { toFollowUpDto, type FollowUpDto } from "../dto/FollowUpDto";

const SYSTEM_ACTOR: FollowUpAuditActor = { actorType: "SYSTEM", actorId: null };

export interface DayBounds {
  /** Start of "today" in the organization timezone (UTC instant). */
  dayStart: Date;
  /** Exclusive end of "today" / start of tomorrow. */
  dayEnd: Date;
  /** Calendar date key YYYY-MM-DD in the organization timezone. */
  dateKey: string;
  /** Start of yesterday (for FOLLOW_UP next-day TL escalation). */
  previousDayStart: Date;
  /** Exclusive end of yesterday. */
  previousDayEnd: Date;
  /** Yesterday's date key. */
  previousDateKey: string;
}

export type FollowUpNotificationKind =
  | "REMINDER"
  | "ESCALATION_TEAM_LEAD"
  | "ESCALATION_MANAGER";

export interface FollowUpNotificationIntent {
  kind: FollowUpNotificationKind;
  followUpId: string;
  recipientUserId: string;
  triggerType: FollowUp["triggerType"];
  scheduledFor: string;
  leadId: string;
  /** Idempotency suffix — typically a calendar date key. */
  dateKey: string;
}

export interface ProcessFollowUpLifecycleResult {
  markedDue: FollowUpDto[];
  markedMissed: FollowUpDto[];
  escalated: FollowUpDto[];
  notifications: FollowUpNotificationIntent[];
}

export interface ProcessFollowUpLifecycleCommand {
  organizationId: string;
  day: DayBounds;
  now?: Date;
  actor?: FollowUpAuditActor;
  correlationId?: string | null;
  limit?: number;
}

function resolveEscalationTargets(
  hierarchy: {
    assignedTeamLeadId: string | null;
    reportingManagerId: string | null;
  } | null,
): { teamLeadId: string | null; managerId: string | null } {
  if (!hierarchy) return { teamLeadId: null, managerId: null };
  return {
    teamLeadId: hierarchy.assignedTeamLeadId,
    managerId: hierarchy.reportingManagerId,
  };
}

export function makeProcessFollowUpLifecycle(
  repository: FollowUpRepository,
  userLookup: UserLookupPort,
) {
  return async function processFollowUpLifecycle(
    command: ProcessFollowUpLifecycleCommand,
  ): Promise<ProcessFollowUpLifecycleResult> {
    const now = command.now ?? new Date();
    const actor = command.actor ?? SYSTEM_ACTOR;
    const correlationId = command.correlationId ?? null;
    const limit = command.limit ?? 100;
    const { organizationId, day } = command;

    const markedDue: FollowUpDto[] = [];
    const markedMissed: FollowUpDto[] = [];
    const escalated: FollowUpDto[] = [];
    const notifications: FollowUpNotificationIntent[] = [];

    // 1) SCHEDULED → DUE when scheduledFor has arrived.
    const dueCandidates = await repository.listDueCandidates(organizationId, {
      dueBy: now,
      statuses: ["SCHEDULED"],
      limit,
    });
    for (const followUp of dueCandidates) {
      const updated = await repository.markDueWithAudit(followUp.id, actor, correlationId);
      if (updated.status === "DUE") markedDue.push(toFollowUpDto(updated));
    }

    // 2) Mark overdue/missed.
    const openDue = await repository.listDueCandidates(organizationId, {
      dueBy: now,
      statuses: ["SCHEDULED", "DUE"],
      limit,
    });
    for (const followUp of openDue) {
      if (!shouldMarkMissed(followUp, day, now)) continue;
      const updated = await repository.markMissedWithAudit(
        followUp.id,
        actor,
        correlationId,
        now,
      );
      if (updated.status === "MISSED") markedMissed.push(toFollowUpDto(updated));
    }

    // 3) Escalate FOLLOW_UP to Team Lead the next day after a missed schedule.
    const followUpEscalationCandidates = await repository.listDueCandidates(organizationId, {
      dueBy: day.previousDayEnd,
      statuses: ["MISSED", "DUE"],
      triggerType: "FOLLOW_UP",
      notEscalated: true,
      limit,
    });
    for (const followUp of followUpEscalationCandidates) {
      if (followUp.scheduledFor >= day.dayStart) continue;
      const result = await escalateToTeamLead(
        repository,
        userLookup,
        followUp,
        day.dateKey,
        actor,
        correlationId,
      );
      if (result) {
        escalated.push(result.dto);
        notifications.push(...result.notifications);
      }
    }

    // 4) Escalate CALL_LATER to Team Lead + Manager when missed.
    const callLaterCandidates = await repository.listDueCandidates(organizationId, {
      dueBy: now,
      statuses: ["MISSED", "DUE", "SCHEDULED"],
      triggerType: "CALL_LATER",
      notEscalated: true,
      limit,
    });
    for (const followUp of callLaterCandidates) {
      if (followUp.scheduledFor > now) continue;
      let current = followUp;
      if (current.status !== "MISSED" && current.status !== "ESCALATED") {
        current = await repository.markMissedWithAudit(current.id, actor, correlationId, now);
        if (current.status === "MISSED") markedMissed.push(toFollowUpDto(current));
      }
      const result = await escalateCallLater(
        repository,
        userLookup,
        current,
        day.dateKey,
        actor,
        correlationId,
      );
      if (result) {
        escalated.push(result.dto);
        notifications.push(...result.notifications);
      }
    }

    return { markedDue, markedMissed, escalated, notifications };
  };
}

function shouldMarkMissed(followUp: FollowUp, day: DayBounds, now: Date): boolean {
  if (followUp.triggerType === "CALL_LATER") {
    return followUp.scheduledFor <= now;
  }
  return followUp.scheduledFor < day.dayStart;
}

async function escalateToTeamLead(
  repository: FollowUpRepository,
  userLookup: UserLookupPort,
  followUp: FollowUp,
  dateKey: string,
  actor: FollowUpAuditActor,
  correlationId: string | null,
): Promise<{ dto: FollowUpDto; notifications: FollowUpNotificationIntent[] } | null> {
  if (followUp.escalatedAt) return null;
  const hierarchy = userLookup.findHierarchy
    ? await userLookup.findHierarchy(followUp.currentAssigneeUserId)
    : null;
  const { teamLeadId, managerId } = resolveEscalationTargets(hierarchy);
  const escalatedToUserId = teamLeadId ?? managerId;
  if (!escalatedToUserId) return null;

  const updated = await repository.escalateWithAudit(
    followUp.id,
    { escalatedToUserId, markEscalated: true },
    actor,
    correlationId,
  );
  return {
    dto: toFollowUpDto(updated),
    notifications: [
      {
        kind: "ESCALATION_TEAM_LEAD",
        followUpId: updated.id,
        recipientUserId: escalatedToUserId,
        triggerType: updated.triggerType,
        scheduledFor: updated.scheduledFor.toISOString(),
        leadId: updated.leadId,
        dateKey,
      },
    ],
  };
}

async function escalateCallLater(
  repository: FollowUpRepository,
  userLookup: UserLookupPort,
  followUp: FollowUp,
  dateKey: string,
  actor: FollowUpAuditActor,
  correlationId: string | null,
): Promise<{ dto: FollowUpDto; notifications: FollowUpNotificationIntent[] } | null> {
  if (followUp.escalatedAt) return null;
  const hierarchy = userLookup.findHierarchy
    ? await userLookup.findHierarchy(followUp.currentAssigneeUserId)
    : null;
  const { teamLeadId, managerId } = resolveEscalationTargets(hierarchy);
  const primary = teamLeadId ?? managerId;
  if (!primary) return null;

  const updated = await repository.escalateWithAudit(
    followUp.id,
    { escalatedToUserId: primary, markEscalated: true },
    actor,
    correlationId,
  );

  const notifications: FollowUpNotificationIntent[] = [
    {
      kind: "ESCALATION_TEAM_LEAD",
      followUpId: updated.id,
      recipientUserId: primary,
      triggerType: updated.triggerType,
      scheduledFor: updated.scheduledFor.toISOString(),
      leadId: updated.leadId,
      dateKey,
    },
  ];
  if (managerId && managerId !== primary) {
    notifications.push({
      kind: "ESCALATION_MANAGER",
      followUpId: updated.id,
      recipientUserId: managerId,
      triggerType: updated.triggerType,
      scheduledFor: updated.scheduledFor.toISOString(),
      leadId: updated.leadId,
      dateKey,
    });
  }

  return { dto: toFollowUpDto(updated), notifications };
}

/** Reminder candidates: open Follow-ups scheduled for "today" in org timezone. */
export function makeListFollowUpReminders(repository: FollowUpRepository) {
  return async function listFollowUpReminders(input: {
    organizationId: string;
    day: DayBounds;
    limit?: number;
  }): Promise<FollowUpNotificationIntent[]> {
    const open = await repository.list(input.organizationId, {
      scheduledFrom: input.day.dayStart,
      scheduledTo: new Date(input.day.dayEnd.getTime() - 1),
      limit: input.limit ?? 200,
    });
    return open
      .filter((followUp) =>
        ["SCHEDULED", "DUE", "MISSED", "ESCALATED"].includes(followUp.status),
      )
      .map((followUp) => ({
        kind: "REMINDER" as const,
        followUpId: followUp.id,
        recipientUserId: followUp.currentAssigneeUserId,
        triggerType: followUp.triggerType,
        scheduledFor: followUp.scheduledFor.toISOString(),
        leadId: followUp.leadId,
        dateKey: input.day.dateKey,
      }));
  };
}

export type ProcessFollowUpLifecycle = ReturnType<typeof makeProcessFollowUpLifecycle>;
export type ListFollowUpReminders = ReturnType<typeof makeListFollowUpReminders>;
