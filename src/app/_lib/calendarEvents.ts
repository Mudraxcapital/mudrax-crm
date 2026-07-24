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
  } = {},
): Promise<CalendarEvent[]> {
  const {
    includeFollowUps = true,
    includeCalls = true,
    includeDeadlines = true,
    assignedToUserIds,
  } = options;

  const [followUps, calls, leads] = await Promise.all([
    includeFollowUps
      ? listFollowUps(organizationId, {
          assignedToUserIds,
          limit: 500,
        })
      : Promise.resolve([]),
    includeCalls
      ? listCallAttempts(organizationId, {
          initiatedFrom: range.from,
          initiatedTo: range.to,
          limit: 500,
        })
      : Promise.resolve([]),
    includeDeadlines
      ? listLeads(organizationId, {
          assignedToUserIds,
          limit: 500,
        })
      : Promise.resolve([]),
  ]);

  const events: CalendarEvent[] = [];

  for (const followUp of followUps) {
    const at = new Date(followUp.scheduledFor);
    if (at < range.from || at > range.to) continue;
    const isMeeting = followUp.triggerType === "CALL_LATER";
    events.push({
      id: `fu-${followUp.id}`,
      type: isMeeting ? "meeting" : "follow_up",
      title: isMeeting ? "Call Later" : "Follow-up",
      startsAt: at,
      href: `/follow-ups/${followUp.id}`,
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
    if (at < range.from || at > range.to) continue;
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
