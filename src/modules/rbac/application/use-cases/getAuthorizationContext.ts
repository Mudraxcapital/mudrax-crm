// ============================================================================
// src/modules/rbac/application/use-cases/getAuthorizationContext.ts
//
// Resolves the full "Users -> UserRoles -> Roles -> RolePermissions ->
// Permissions" chain (ADR 0002) plus Data Scope (platform-contracts.md §2)
// for one authenticated User, reading organization membership fresh on
// every call — never snapshotted onto a session — so a Role/Branch/Team
// change takes effect on the User's very next request.
// ============================================================================

import { getUserScopeContext } from "@/modules/users";
import type { RbacRepository } from "../../domain/repositories/RbacRepository";
import type { AuthorizationContext } from "../../domain/entities/AuthorizationContext";
import { widerScope, type DataScope } from "../../domain/value-objects/DataScope";

export function makeGetAuthorizationContext(repository: RbacRepository) {
  return async function getAuthorizationContext(
    userId: string,
  ): Promise<AuthorizationContext | null> {
    const scopeContext = await getUserScopeContext(userId);
    if (!scopeContext || scopeContext.status !== "ACTIVE") {
      return null;
    }

    const roles = await repository.getEffectiveRolesForUser(userId);
    const grants = await repository.getPermissionGrantsForRoles(roles.map((role) => role.id));

    const permissions: Record<string, DataScope> = {};
    for (const grant of grants) {
      const existing = permissions[grant.code];
      permissions[grant.code] = existing ? widerScope(existing, grant.scope) : grant.scope;
    }

    return {
      userId,
      organizationId: scopeContext.organizationId,
      roles,
      permissions,
      scope: {
        teamId: scopeContext.currentTeamId,
        branchId: scopeContext.currentBranchId,
        departmentId: scopeContext.currentDepartmentId,
      },
    };
  };
}
