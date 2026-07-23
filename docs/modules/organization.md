# Organization

## Purpose

Own the company's organizational hierarchy, business calendars, operating
hours, and escalation policies without duplicating User identity or RBAC.

## Owned Entities

- Team
- Branch
- Region
- Department
- Holiday Calendar
- Working Hours
- Escalation Rule

## Business Rules

- Users are referenced from `users`; Roles and Permissions are referenced from
  `rbac`.
- Organizational transfers preserve User identity and historical ownership.
- Escalations target a Role within an organizational scope, not a hard-coded
  named User.
- Archived organizational units remain available to historical reporting.
- Working-day calculations use Holiday Calendar plus Working Hours in the
  configured timezone.

## Dependencies

- Supplies hierarchy/scope to `campaigns`, `reports`, and future branch-level
  authorization.
- Supplies calendars and escalation policies to `follow-ups` and `telephony`.
- Consumes stable User identities from `users` and authorization concepts from
  `rbac`.

## Implementation Status

Architecture documentation only. No schema, Prisma models, APIs, UI, or
business logic exist.
