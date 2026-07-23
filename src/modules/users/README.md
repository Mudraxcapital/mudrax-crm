# Users Module

The canonical identity and profile for every employee who uses the CRM.

## Boundary

- A **User is the identity**. It represents one person and remains stable
  throughout promotions, transfers, or changes in responsibility.
- Job functions such as Caller, Manager, Team Leader, and Admin are Roles
  assigned through the `rbac` module. They are not separate User types or
  standalone modules.
- This module owns identity/profile lifecycle. The `rbac` module owns Roles,
  Permissions, assignments, and authorization policy evaluation.
- `organization` owns Team, Branch, Region, and Department membership plus
  operating calendars and escalation policy; these references never replace
  the User identity owned here.
- Future positions such as HR, Branch Manager, Regional Manager, Recovery
  Officer, and Sales Executive must be added as Roles without creating new
  identity modules.

**Never put here**: role-specific duplicate identities, permission evaluation,
or separate entities for each job title. A promotion changes role assignments;
it does not replace or re-create the User.

Follows the standard Clean Architecture layering:

- `domain/` - entities, value objects, domain events, repository interfaces. No framework dependencies.
- `application/` - use-cases, DTOs, validators, ports (interfaces for external services).
- `infrastructure/` - Prisma repository implementations, mappers, adapters. The only layer allowed to know about Prisma.
- `presentation/` - feature-specific React components, hooks, and HTTP controllers.

Other modules may only import from this module's `index.ts` - never from its internal folders.
