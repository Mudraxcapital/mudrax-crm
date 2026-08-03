// ============================================================================
// src/modules/rbac/application/use-cases/getAuthorizationContext.ts
// ============================================================================

import { createTtlCache } from "@/infra/cache/ttlCache";
import { getCompanyId } from "@/infra/company/getCompanyId";
import { getUserScopeContext, resolveVisibleHierarchy } from "@/modules/users";
import type { RbacRepository } from "../../domain/repositories/RbacRepository";
import type { AuthorizationContext } from "../../domain/entities/AuthorizationContext";
import { FIXED_ROLES } from "../../domain/entities/FixedRoles";
import { widerScope, type DataScope } from "../../domain/value-objects/DataScope";
import type { HierarchyPrimaryRole } from "../../domain/value-objects/HierarchyScope";

/** Short TTL — roles/hierarchy rarely change; session validity is checked separately. */
const AUTH_CONTEXT_TTL_MS = 15_000;
const authContextCache = createTtlCache<AuthorizationContext>(AUTH_CONTEXT_TTL_MS);

export function invalidateAuthorizationContextCache(userId?: string): void {
  if (userId) authContextCache.delete(userId);
  else authContextCache.clear();
}

export function makeGetAuthorizationContext(repository: RbacRepository) {
  return async function getAuthorizationContext(
    userId: string,
  ): Promise<AuthorizationContext | null> {
    const cached = authContextCache.get(userId);
    if (cached) return cached;

    const [scopeContext, roles, organizationId] = await Promise.all([
      getUserScopeContext(userId),
      repository.getEffectiveRolesForUser(userId),
      getCompanyId(),
    ]);

    if (!scopeContext || scopeContext.status !== "ACTIVE") {
      return null;
    }

    const primaryRoleName = (
      roles.find((role) => (FIXED_ROLES as readonly string[]).includes(role.name))?.name ??
      roles[0]?.name ??
      null
    ) as HierarchyPrimaryRole | null;

    const [grants, hierarchy] = await Promise.all([
      repository.getPermissionGrantsForRoles(roles.map((role) => role.id)),
      resolveVisibleHierarchy(userId, {
        scope: scopeContext,
        primaryRoleName,
      }),
    ]);

    const permissions: Record<string, DataScope> = {};
    for (const grant of grants) {
      const existing = permissions[grant.code];
      permissions[grant.code] = existing ? widerScope(existing, grant.scope) : grant.scope;
    }

    const context: AuthorizationContext = {
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

    authContextCache.set(userId, context);
    return context;
  };
}
