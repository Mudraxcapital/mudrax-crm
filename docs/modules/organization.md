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

The **Organization**, **Branch**, **Department**, and **Team** aggregates are
implemented: repository, application use-cases (create/update/read/list),
validation, DTOs, dedicated Permissions (`organization.manage`,
`branch.manage`, `department.manage`, `team.manage`, plus `organization.view`
shared across all four for read access), pages (`/organizations`, `/branches`,
`/departments`, `/teams`, each with a matching `[id]/edit` page), REST APIs
(`/api/organizations`, `/api/branches`, `/api/departments`, `/api/teams`),
and an append-only, hash-chained Audit Log
(`organization.organization_audit_log`, one shared table per module,
distinguished by `targetType`) recording every create/update. Team's
`branchId` is validated against a real Branch in the same Organization before
being written.

Region, Holiday Calendar, Working Hours, and Escalation Rule remain
architecture documentation only — no repository, API, UI, or business logic
exists for them yet. Their Prisma models exist (from the earlier
schema-only pass) but are not wired to any application code. Branch's
`regionId` column is not yet surfaced through the Branch aggregate's
application/presentation layers for the same reason.
