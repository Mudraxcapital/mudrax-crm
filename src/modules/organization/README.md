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

## Implementation Status

The **Organization** aggregate root itself is implemented end-to-end:

- `domain/` — `Organization` entity, `OrganizationAuditRecord`, repository
  interface, domain errors.
- `application/` — `createOrganization`/`updateOrganization`/
  `getOrganization`/`listOrganizations`/`listOrganizationAuditLog` use-cases,
  Zod validators, DTOs.
- `infrastructure/` — `PrismaOrganizationRepository` (writes the
  Organization row and its Audit Record atomically in one `$transaction`).
- `presentation/` — Server Actions + `OrganizationForm`, consumed by
  `src/app/organizations/page.tsx` (list + create) and
  `src/app/organizations/[id]/edit/page.tsx` (edit).
- `src/app/api/organizations` — REST API (`GET`/`POST`/`GET :id`/`PATCH :id`).
- RBAC: `organization.view` (read, Caller+) and `organization.manage`
  (create/update, Admin-only, SYSTEM scope) — see
  `prisma/seed/lib/rbac-catalog.ts`.
- Audit logging: every create/update writes an append-only, hash-chained
  `organization.organization_audit_log` row (migrations `...add_organization_audit_log`
  and `..._organization_audit_log_protections`), the same canonical shape
  platform-contracts.md §4 already uses for `documents.AuditTrail` /
  `notifications.CommunicationLog` / `ai_core.AiAuditLog`.
- Tests: `src/modules/organization/__tests__` (unit tests against a fake
  repository, plus one integration test against the real database).

Team, Branch, Region, Department, Holiday Calendar, Working Hours, and
Escalation Rule remain architecture documentation only — their Prisma
models exist, but no repository, use-case, API, or UI has been built for
them. This was an explicit scope boundary: only the Organization aggregate
itself was implemented in this pass.
