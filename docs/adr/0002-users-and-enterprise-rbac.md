# 0002 — Users and Enterprise RBAC

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-07-23 |

## Context

Employee titles describe responsibilities, not separate identities. The same
person may join as a Caller, become a Manager, later become an Admin, or move
between branches without becoming a different User. Modeling job titles as
standalone business modules would duplicate identity lifecycle, fragment
authorization, and make promotions and transfers unnecessarily destructive.

## Decision

`users` is the sole employee identity module and `rbac` is the sole
authorization module.

- **User is the identity.**
- **Role defines a responsibility bundle.**
- **Permission defines one atomic capability.**
- **UserRoles assigns one or more Roles to a User.**
- **RolePermissions grants Permissions to a Role.**
- **RBAC evaluates effective access.**

Caller, Manager, Team Leader, and Admin are Roles assigned to a User. Future
positions—including HR, Branch Manager, Regional Manager, Recovery Officer,
and Sales Executive—must also be added as Roles, not as new modules.

The approved conceptual relationship is:

`Users -> UserRoles -> Roles -> RolePermissions -> Permissions`

This ADR defines architecture only. It does not authorize database tables,
Prisma models, APIs, authentication, or UI.

## Consequences

- Promotions and transfers change role assignments while preserving User
  identity, history, audit records, and ownership references.
- A User can hold multiple Roles where the organization requires it.
- Business modules authorize atomic Permissions through the `rbac` public API;
  they do not hard-code job-title checks or depend on job-title modules.
- Adding an organizational title does not change repository module boundaries.
- Authentication identifies the User; RBAC independently determines what that
  authenticated User may do.

## Alternatives Considered

- **One module/entity per job title**: rejected because titles are mutable
  assignments, not independent business identities.
- **A single role field on User**: rejected as the enterprise target because it
  cannot cleanly support multiple concurrent roles, temporary assignments, or
  future organizational complexity.
