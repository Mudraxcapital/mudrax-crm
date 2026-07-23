# Follow Ups

## Purpose

Own scheduled follow-up/callback tasks tied to Leads, including reminders,
missed-schedule escalation, and reassignment — as an independent Aggregate
Root, not as data buried inside the Lead aggregate. Lives inside the CRM
Core boundary (`src/modules/follow-ups`), sitting alongside but separate
from `leads`.

## Owned Entities

- Follow-up - a scheduled callback/reminder task referencing a Lead (and
  transitively its Customer) by identity. Lifecycle: Scheduled -> Due ->
  Completed / Missed -> Escalated.

## Business Rules

- Follow-up is its own Aggregate Root, deliberately not a child entity of
  the Lead aggregate. Its dominant queries — "what's due today across my
  whole portfolio," "reassign this absent Caller's follow-ups" — are
  Follow-up-centric, not Lead-centric, and answering them would be
  inefficient if Follow-up were a collection buried inside every individual
  Lead.
- Follow-up and Call Later are distinct trigger types with the same
  structural shape but different escalation timing (BRD §11): Follow-up
  escalates to the Team Leader the next day if not actioned; Call Later
  escalates to the Team Leader and Manager on a missed schedule.
- Every Follow-up requires a mandatory next date and time.
- Only a Team Leader or Manager may reassign a Follow-up to another Caller;
  reassignment never changes the underlying Lead's other state.
- Escalation timing and recipients are driven by `organization`'s Working
  Hours, Holiday Calendar, and Escalation Rule policy — never hard-coded
  here.
- `leads` retains only a denormalized "next action" projection (derived from
  this module's Follow-up state), maintained exclusively by a Follow-up
  domain-event listener. No other code path may write that projection.
- Creating, completing, or cancelling a Follow-up must always go through
  this module — never through a side channel that could leave `leads`'
  "next action" projection stale.

## Who Can Do What

| Role | Capability |
| --- | --- |
| Admin | Full access to all Follow-ups |
| Manager | Views and reassigns Follow-ups within their span; receives Call Later escalations |
| Team Leader | Views and reassigns Follow-ups within their team; receives next-day Follow-up escalations and Call Later escalations |
| Caller | Creates and completes Follow-ups on own assigned Leads only |

## Dependencies

- References Leads owned by `leads`; never duplicates Lead state.
- Consumes Working Hours, Holiday Calendar, and Escalation Rule policy from
  `organization`.
- Calls `notifications` (out of scope for this document) to deliver
  escalation alerts.
- Publishes significant events to `activity-timeline` and updates `leads`'
  denormalized "next action" projection.

## Open Questions

- Should Follow-up and Call Later ever be split into two distinct entities
  rather than two trigger types of the same entity, if their business rules
  diverge further in the future?

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
