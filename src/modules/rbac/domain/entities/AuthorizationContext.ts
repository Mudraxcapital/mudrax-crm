// ============================================================================
// src/modules/rbac/domain/entities/AuthorizationContext.ts
//
// The resolved "what can this authenticated User do, and over what data"
// result of the `Users -> UserRoles -> Roles -> RolePermissions ->
// Permissions` chain (ADR 0002), combined with organization membership for
// Data Scope resolution (platform-contracts.md §2).
//
// Never cached long-lived or embedded in a long-lived session token —
// platform-contracts.md §2 requires scope/capability to reflect the User's
// *current* Role/Team/Branch membership so a transfer or role change takes
// effect immediately, without re-authorization.
// ============================================================================

import type { DataScope } from "../value-objects/DataScope";

export interface AuthorizationRole {
  id: string;
  name: string;
}

export interface AuthorizationContext {
  userId: string;
  organizationId: string;
  roles: AuthorizationRole[];
  /** Effective Permission -> Data Scope map (widest scope wins across all held Roles). */
  permissions: Record<string, DataScope>;
  scope: {
    teamId: string | null;
    branchId: string | null;
    departmentId: string | null;
  };
}

export function hasPermission(context: AuthorizationContext, permissionCode: string): boolean {
  return permissionCode in context.permissions;
}

export function hasRole(context: AuthorizationContext, roleName: string): boolean {
  return context.roles.some((role) => role.name === roleName);
}

export function getPermissionScope(
  context: AuthorizationContext,
  permissionCode: string,
): DataScope | null {
  return context.permissions[permissionCode] ?? null;
}
