// ============================================================================
// src/modules/follow-ups/application/use-cases/processFollowUpLifecycle.ts
//
// Background-job facing use-cases: mark due, mark overdue/missed, escalate
// Caller → Team Lead (next calendar day) → Manager + Admin (next day after TL).
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
  /** Start of yesterday (for reminder date keys). */
  previousDayStart: Date;
  /** Exclusive end of yesterday. */
  previousDayEnd: Date;
  /** Yesterday's date key. */
  previousDateKey: string;
}

export type FollowUpNotificationKind =
  | "REMINDER"
  | "ESCALATION_TEAM_LEAD"
  | "ESCALATION_MANAGER"
  | "ESCALATION_ADMIN";

export interface FollowUpNotificationIntent {
  kind: FollowUpNotificationKind;
  followUpId: string;
  recipientUserId: string;
  triggerType: FollowUp["triggerType"];
  scheduledFor: string;
  leadId: string;
  /** Idempotency suffix — typically a calendar date key + escalation step. */
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

    // 1) SCHEDULED → DUE when scheduledFor has arrived + notify assignee.
    const dueCandidates = await repository.listDueCandidates(organizationId, {
      dueBy: now,
      statuses: ["SCHEDULED"],
      limit,
    });
    for (const followUp of dueCandidates) {
      const updated = await repository.markDueWithAudit(followUp.id, actor, correlationId);
      if (updated.status === "DUE") {
        markedDue.push(toFollowUpDto(updated));
        notifications.push({
          kind: "REMINDER",
          followUpId: updated.id,
          recipientUserId: updated.currentAssigneeUserId,
          triggerType: updated.triggerType,
          scheduledFor: updated.scheduledFor.toISOString(),
          leadId: updated.leadId,
          dateKey: `${day.dateKey}:due`,
        });
      }
    }

    // 2) Mark missed once the scheduled calendar day has ended.
    const openDue = await repository.listDueCandidates(organizationId, {
      dueBy: day.previousDayEnd,
      statuses: ["SCHEDULED", "DUE"],
      limit,
    });
    for (const followUp of openDue) {
      if (followUp.scheduledFor >= day.dayStart) continue;
      const updated = await repository.markMissedWithAudit(
        followUp.id,
        actor,
        correlationId,
        now,
      );
      if (updated.status === "MISSED") markedMissed.push(toFollowUpDto(updated));
    }

    // 3) Caller unanswered into the next calendar day → Team Lead.
    const tlCandidates = await repository.listDueCandidates(organizationId, {
      dueBy: day.previousDayEnd,
      statuses: ["DUE", "MISSED", "SCHEDULED"],
      notEscalated: true,
      limit,
    });
    for (const followUp of tlCandidates) {
      if (followUp.scheduledFor >= day.dayStart) continue;
      const result = await escalateToTeamLead(
        repository,
        userLookup,
        followUp,
        `${day.dateKey}:tl`,
        actor,
        correlationId,
        now,
      );
      if (result) {
        escalated.push(result.dto);
        notifications.push(...result.notifications);
      }
    }

    // 4) Team Lead unanswered into the next calendar day → Manager + Admins.
    const managerCandidates = await repository.listDueCandidates(organizationId, {
      dueBy: now,
      statuses: ["ESCALATED", "MISSED", "DUE"],
      limit,
    });
    for (const followUp of managerCandidates) {
      if (!followUp.escalatedAt || !followUp.escalatedToUserId) continue;
      // TL had at least one full calendar day after escalation.
      if (followUp.escalatedAt >= day.dayStart) continue;
      const result = await escalateToManagerAndAdmins(
        repository,
        userLookup,
        followUp,
        organizationId,
        `${day.dateKey}:mgr`,
        actor,
        correlationId,
        now,
      );
      if (result) {
        escalated.push(result.dto);
        notifications.push(...result.notifications);
      }
    }

    return { markedDue, markedMissed, escalated, notifications };
  };
}

async function escalateToTeamLead(
  repository: FollowUpRepository,
  userLookup: UserLookupPort,
  followUp: FollowUp,
  dateKey: string,
  actor: FollowUpAuditActor,
  correlationId: string | null,
  now: Date,
): Promise<{ dto: FollowUpDto; notifications: FollowUpNotificationIntent[] } | null> {
  if (followUp.escalatedAt) return null;
  const hierarchy = userLookup.findHierarchy
    ? await userLookup.findHierarchy(followUp.currentAssigneeUserId)
    : null;
  const { teamLeadId, managerId } = resolveEscalationTargets(hierarchy);
  const escalatedToUserId = teamLeadId ?? managerId;
  if (!escalatedToUserId) return null;
  if (escalatedToUserId === followUp.currentAssigneeUserId) return null;

  const updated = await repository.escalateWithAudit(
    followUp.id,
    { escalatedToUserId, markEscalated: true, reassignToEscalatedUser: true },
    actor,
    correlationId,
    now,
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

async function escalateToManagerAndAdmins(
  repository: FollowUpRepository,
  userLookup: UserLookupPort,
  followUp: FollowUp,
  organizationId: string,
  dateKey: string,
  actor: FollowUpAuditActor,
  correlationId: string | null,
  now: Date,
): Promise<{ dto: FollowUpDto; notifications: FollowUpNotificationIntent[] } | null> {
  if (!followUp.escalatedToUserId) return null;

  const hierarchy = userLookup.findHierarchy
    ? await userLookup.findHierarchy(followUp.currentAssigneeUserId)
    : null;
  const managerId = hierarchy?.reportingManagerId ?? null;
  const adminIds = userLookup.listActiveAdminIds
    ? await userLookup.listActiveAdminIds(organizationId)
    : [];

  const primaryAssignee =
    managerId && managerId !== followUp.currentAssigneeUserId
      ? managerId
      : adminIds.find((id) => id !== followUp.currentAssigneeUserId) ?? null;

  if (!primaryAssignee) return null;
  // Already escalated to manager/admin level.
  if (followUp.escalatedToUserId === primaryAssignee) return null;
  if (managerId && followUp.escalatedToUserId === managerId) return null;

  const updated = await repository.escalateWithAudit(
    followUp.id,
    { escalatedToUserId: primaryAssignee, markEscalated: true, reassignToEscalatedUser: true },
    actor,
    correlationId,
    now,
  );

  const notifications: FollowUpNotificationIntent[] = [];
  const notified = new Set<string>();

  if (managerId) {
    notifications.push({
      kind: "ESCALATION_MANAGER",
      followUpId: updated.id,
      recipientUserId: managerId,
      triggerType: updated.triggerType,
      scheduledFor: updated.scheduledFor.toISOString(),
      leadId: updated.leadId,
      dateKey,
    });
    notified.add(managerId);
  }

  for (const adminId of adminIds) {
    if (notified.has(adminId)) continue;
    notifications.push({
      kind: "ESCALATION_ADMIN",
      followUpId: updated.id,
      recipientUserId: adminId,
      triggerType: updated.triggerType,
      scheduledFor: updated.scheduledFor.toISOString(),
      leadId: updated.leadId,
      dateKey,
    });
    notified.add(adminId);
  }

  if (notifications.length === 0) {
    notifications.push({
      kind: "ESCALATION_MANAGER",
      followUpId: updated.id,
      recipientUserId: primaryAssignee,
      triggerType: updated.triggerType,
      scheduledFor: updated.scheduledFor.toISOString(),
      leadId: updated.leadId,
      dateKey,
    });
  }

  return { dto: toFollowUpDto(updated), notifications };
}

/** Reminder candidates: open Follow-ups that are due now (scheduledFor <= now). */
export function makeListFollowUpReminders(repository: FollowUpRepository) {
  return async function listFollowUpReminders(input: {
    organizationId: string;
    day: DayBounds;
    now?: Date;
    limit?: number;
  }): Promise<FollowUpNotificationIntent[]> {
    const now = input.now ?? new Date();
    const open = await repository.list(input.organizationId, {
      scheduledFrom: input.day.dayStart,
      scheduledTo: new Date(input.day.dayEnd.getTime() - 1),
      limit: input.limit ?? 200,
    });
    return open
      .filter(
        (followUp) =>
          ["SCHEDULED", "DUE", "MISSED", "ESCALATED"].includes(followUp.status) &&
          followUp.scheduledFor.getTime() <= now.getTime(),
      )
      .map((followUp) => ({
        kind: "REMINDER" as const,
        followUpId: followUp.id,
        recipientUserId: followUp.currentAssigneeUserId,
        triggerType: followUp.triggerType,
        scheduledFor: followUp.scheduledFor.toISOString(),
        leadId: followUp.leadId,
        dateKey: `${input.day.dateKey}:reminder`,
      }));
  };
}

export type ProcessFollowUpLifecycle = ReturnType<typeof makeProcessFollowUpLifecycle>;
export type ListFollowUpReminders = ReturnType<typeof makeListFollowUpReminders>;
