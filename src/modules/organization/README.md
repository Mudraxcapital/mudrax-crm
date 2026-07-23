# Organization Module

Owns Mudrax Capitals' organizational structure, operating calendar, and
escalation policies. This is a business bounded context; it does not own User
identity or authorization.

## Ownership

### Team

An operational group of Users, typically supervised by a User holding the Team
Leader Role and overseen by a User holding the Manager Role.

- A User's identity remains owned by `users`.
- Roles and access remain owned by `rbac`.
- Team membership and reporting structure are owned here.
- Moving a User between Teams must preserve historical assignments and
  performance records.

### Branch

A physical or operational office of Mudrax Capitals. Branches scope Teams,
working calendars, and future branch-level reporting and access policies.

### Region

A geographic or managerial grouping of Branches. Regions support future
Regional Manager responsibilities and regional reporting without creating a
Regional Manager module.

### Department

A functional grouping such as Sales, Operations, Recovery, or HR. Departments
are independent of Roles: a User may change Department without changing
identity.

### Holiday Calendar

Defines non-working dates used when calculating due dates, next-business-day
follow-up escalation, and future telephony routing behavior.

### Working Hours

Defines business hours, including future Branch-specific schedules. Follow-up
scheduling, dialer windows, and SLA calculations consume this policy through
the module's public boundary.

### Escalation Rule

Defines when an overdue business obligation escalates and which Role or
organizational scope receives it. Examples include missed Follow-ups, overdue
Call Later tasks, and future SLA breaches.

## Relationships

- `users` supplies stable User identities.
- `rbac` supplies Roles and Permissions; this module never creates job-title
  identity types.
- `follow-ups` consumes Working Hours, Holiday Calendars, and Escalation Rules.
- `campaigns` may scope Campaign membership by Team, Branch, or Region.
- `reports` consumes organizational hierarchy for scoped rollups.
- `telephony` may consume Working Hours and escalation policy for queues,
  dialers, and IVR.

## Business Rules

- User identity must never be duplicated inside this module.
- Team, Branch, Region, and Department changes are effective-dated or otherwise
  historically traceable; historical reports must not be rewritten.
- Escalation recipients are defined by Role and scope, not by hard-coded named
  Users.
- Archived organizational units remain available to historical records.
- Holiday and Working Hours calculations use the configured business timezone
  (initially Asia/Kolkata).

## Future Expansion

- Multi-branch operations and branch-level P&L.
- Temporary Team membership and acting-supervisor assignments.
- Regional calendars and local working-hour policies.
- Multi-step escalation chains and SLA policies.

This module currently contains architecture documentation only. No database
schema, Prisma models, APIs, UI, or business logic have been created.
