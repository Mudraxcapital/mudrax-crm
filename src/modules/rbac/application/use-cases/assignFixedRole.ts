// ============================================================================
// src/modules/rbac/application/use-cases/assignFixedRole.ts
// ============================================================================

import type { RbacRepository } from "../../domain/repositories/RbacRepository";
import { FIXED_ROLES, type FixedRoleName } from "../../domain/entities/FixedRoles";
import { invalidateAuthorizationContextCache } from "./getAuthorizationContext";

export function makeAssignFixedRole(repository: RbacRepository) {
  return async function assignFixedRole(
    userId: string,
    roleName: FixedRoleName,
    assignedByUserId: string | null,
  ): Promise<{ previousRole: FixedRoleName | null; nextRole: FixedRoleName }> {
    if (!(FIXED_ROLES as readonly string[]).includes(roleName)) {
      throw new Error(`Invalid fixed role: ${roleName}`);
    }

    const previous = await repository.getPrimaryRoleName(userId);
    await repository.replaceUserFixedRole(userId, roleName, assignedByUserId);
    invalidateAuthorizationContextCache(userId);
    return {
      previousRole:
        previous && (FIXED_ROLES as readonly string[]).includes(previous)
          ? (previous as FixedRoleName)
          : null,
      nextRole: roleName,
    };
  };
}

export function makeListFixedRoles(repository: RbacRepository) {
  return async function listFixedRoles() {
    return repository.listFixedRoles();
  };
}

export function makeGetPrimaryRoleName(repository: RbacRepository) {
  return async function getPrimaryRoleName(userId: string) {
    const name = await repository.getPrimaryRoleName(userId);
    if (name && (FIXED_ROLES as readonly string[]).includes(name)) {
      return name as FixedRoleName;
    }
    return null;
  };
}

export function makeGetPermissionCodesForUser(repository: RbacRepository) {
  return async function getPermissionCodesForUser(userId: string): Promise<string[]> {
    const roles = await repository.getEffectiveRolesForUser(userId);
    const grants = await repository.getPermissionGrantsForRoles(roles.map((r) => r.id));
    return [...new Set(grants.map((g) => g.code))].sort();
  };
}
