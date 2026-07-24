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

The **Organization**, **Branch**, **Department**, and **Team** aggregates are
implemented end-to-end, following the identical Clean Architecture + `make*`
factory pattern for each:

- `domain/` — `Organization`/`Branch`/`Department`/`Team` entities, the
  shared `OrganizationAuditRecord`/`OrganizationAuditActor` shape (module-
  level, reused by every aggregate's Audit Record — not duplicated per
  aggregate), one repository interface per aggregate, and domain errors
  (`*NotFoundError`, `Duplicate*CodeError`, plus Team's
  `InvalidBranchReferenceError` for its cross-aggregate `branchId` check).
- `application/` — `create*`/`update*`/`get*`/`list*`/`list*AuditLog`
  use-cases, Zod validators, DTOs, one set per aggregate.
  `createTeam`/`updateTeam` additionally depend on `BranchRepository` to
  validate `branchId` references a real Branch in the same Organization
  before writing (an explicit `findById -> null -> typed error` check,
  established here as the pattern for same-module cross-aggregate
  references, rather than relying on the database's FK constraint to fail
  silently).
- `infrastructure/` — `PrismaBranchRepository`/`PrismaDepartmentRepository`/
  `PrismaTeamRepository` (alongside `PrismaOrganizationRepository`), each
  writing its row and Audit Record atomically in one `$transaction`.
- `presentation/` — Server Actions + `BranchForm`/`DepartmentForm`/`TeamForm`,
  consumed by `src/app/branches`, `src/app/departments`, and `src/app/teams`
  (list + create pages, `[id]/edit` pages). `organizationId` is always taken
  from the acting User's own Authorization Context
  (`session.authContext.organizationId`), never from client-supplied input.
- `src/app/api/{branches,departments,teams}` — REST API
  (`GET`/`POST`/`GET :id`/`PATCH :id`) for each aggregate.
- RBAC: `organization.view` (read all four aggregates, Caller+),
  `organization.manage` (Organization create/update, Admin-only, SYSTEM
  scope), `branch.manage` (Manager+), `department.manage` (Admin-only),
  `team.manage` (Manager+) — see `prisma/seed/lib/rbac-catalog.ts`.
- Audit logging: every create/update writes an append-only, hash-chained
  `organization.organization_audit_log` row — the **same table** the
  Organization aggregate itself uses (one Audit Trail per module,
  platform-contracts.md §4, not one table per aggregate), distinguished by
  `targetType` (`"Branch"` / `"Department"` / `"Team"` / `"Organization"`).
  No new migration was needed for Branch/Department/Team: the table's shape
  was already generic.
- Tests: `src/modules/organization/__tests__` — unit tests against an
  in-memory fake repository per aggregate (create/update/get/list/schema
  validation, including Team's Branch-reference checks), plus one
  integration test per aggregate against the real database (verifying the
  live hash-chain trigger and append-only Audit Trail).

Region, Holiday Calendar, Working Hours, and Escalation Rule remain
architecture documentation only — their Prisma models exist, but no
repository, use-case, API, or UI has been built for them. Branch's
`regionId` column exists but is intentionally not surfaced by this module's
domain/application/presentation layers until Region itself is implemented.
