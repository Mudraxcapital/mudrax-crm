// ============================================================================
// src/modules/rbac/application/use-cases/getAuthorizationContext.ts
// ============================================================================

import { getCompanyId } from "@/infra/company/getCompanyId";
import { getUserScopeContext, resolveVisibleHierarchy } from "@/modules/users";
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

    // Company scope for other modules (CRM/Campaigns/…) — not stored on User.
    const organizationId = await getCompanyId();
    const hierarchy = await resolveVisibleHierarchy(userId);

    return {
      userId,
      organizationId,
      roles,
      permissions,
      scope: {
        teamId: scopeContext.currentTeamId,
        branchId: scopeContext.currentBranchId,
        departmentId: scopeContext.currentDepartmentId,
      },
      hierarchy,
      canManageCallerAccounts: scopeContext.canManageCallerAccounts,
    };
  };
}
