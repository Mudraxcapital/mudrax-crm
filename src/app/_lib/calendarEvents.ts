// ============================================================================
// src/app/_lib/calendarEvents.ts
//
// Calendar View composition: Follow-ups, Calls, Meetings (follow-up CALL_LATER),
// and Lead next-action deadlines.
// ============================================================================

import { listFollowUps } from "@/modules/follow-ups";
import { listCallAttempts } from "@/modules/telephony";
import { listLeads } from "@/modules/leads";

export type CalendarEventType = "follow_up" | "call" | "meeting" | "deadline";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  startsAt: Date;
  href: string;
  meta?: string;
}

export async function listCalendarEvents(
  organizationId: string,
  range: { from: Date; to: Date },
  options: {
    includeFollowUps?: boolean;
    includeCalls?: boolean;
    includeDeadlines?: boolean;
    assignedToUserIds?: string[];
    agentUserId?: string;
    agentUserIds?: string[];
    leadFilter?: {
      ownerManagerId?: string;
      ownerTeamLeadId?: string;
      assignedToUserIds?: string[];
    };
  } = {},
): Promise<CalendarEvent[]> {
  const {
    includeFollowUps = true,
    includeCalls = true,
    includeDeadlines = true,
    assignedToUserIds,
    agentUserId,
    agentUserIds,
    leadFilter,
  } = options;

  const [followUps, calls, leads] = await Promise.all([
    includeFollowUps
      ? listFollowUps(organizationId, {
          assignedToUserIds,
          scheduledFrom: range.from,
          scheduledTo: range.to,
          // Month-scoped query — high ceiling for dense books, not a silent drop.
          limit: 50_000,
        })
      : Promise.resolve([]),
    includeCalls
      ? listCallAttempts(organizationId, {
          initiatedFrom: range.from,
          initiatedTo: range.to,
          agentUserId,
          agentUserIds,
          limit: 50_000,
        })
      : Promise.resolve([]),
    includeDeadlines
      ? listLeads(organizationId, {
          ...leadFilter,
          assignedToUserIds: leadFilter?.assignedToUserIds ?? assignedToUserIds,
          hasNextAction: true,
          nextActionFrom: range.from,
          nextActionTo: range.to,
          limit: 50_000,
        })
      : Promise.resolve([]),
  ]);

  const events: CalendarEvent[] = [];

  for (const followUp of followUps) {
    const at = new Date(followUp.scheduledFor);
    const isMeeting = followUp.triggerType === "CALL_LATER";
    events.push({
      id: `fu-${followUp.id}`,
      type: isMeeting ? "meeting" : "follow_up",
      title: isMeeting ? "Call Later" : "Follow-up",
      startsAt: at,
      href: `/leads/${followUp.leadId}`,
      meta: followUp.status,
    });
  }

  for (const call of calls) {
    const at = new Date(call.initiatedAt);
    events.push({
      id: `call-${call.id}`,
      type: "call",
      title: `Call · ${call.status}`,
      startsAt: at,
      href: `/telephony/calls/${call.id}`,
      meta: call.disposition ?? call.direction,
    });
  }

  for (const lead of leads) {
    if (!lead.nextActionAt) continue;
    const at = new Date(lead.nextActionAt);
    events.push({
      id: `deadline-${lead.id}`,
      type: "deadline",
      title: `Deadline · ${lead.fullNameSnapshot}`,
      startsAt: at,
      href: `/leads/${lead.id}`,
      meta: lead.nextActionType ?? "Next action",
    });
  }

  events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return events;
}

/** Local calendar day key (YYYY-MM-DD) matching toLocale* day grouping. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
