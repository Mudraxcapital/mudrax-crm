# Rbac Module

Role-Based Access Control — roles, permissions, and policy evaluation used to authorize actions across every module.

## Enterprise RBAC Model

The recommended conceptual model is:

- **Users** — stable identities owned by the `users` module.
- **Roles** — named responsibility bundles such as Caller, Manager, Team
  Leader, Admin, HR, Branch Manager, Regional Manager, Recovery Officer, or
  Sales Executive.
- **Permissions** — atomic capabilities such as `lead.assign`,
  `call_recording.listen`, or `report.team.read`.
- **UserRoles** — many-to-many assignments connecting Users to Roles. These
  support promotion, transfer, temporary responsibility, and multiple
  concurrent roles without changing a User's identity.
- **RolePermissions** — many-to-many grants connecting Roles to Permissions.

Authorization evaluates the current User's assigned Roles and their effective
Permissions. Business modules request permission checks from `rbac`; they do
not infer access from job-title-specific module types.

This is an architecture contract only. Database tables and Prisma models must
not be created until the data model is separately reviewed and approved.

## Separation of Responsibilities

- `users` owns who the person is and their profile lifecycle.
- `rbac` owns what that person may do.
- Authentication proves which User is making the request.
- Business modules enforce the relevant Permission through the RBAC public API.

**Never put here**: duplicate User identities, business workflow logic, or a
new module for each organizational title.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
