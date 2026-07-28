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
import type { HierarchyScope } from "../value-objects/HierarchyScope";

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
  /**
   * Hierarchical ownership (Admin → Manager → Team Lead → Caller).
   * Repositories / APIs must apply this — never rely on UI hiding alone.
   */
  hierarchy: HierarchyScope;
  /** Team Lead only — delete/disable/suspend assigned Callers when true. */
  canManageCallerAccounts: boolean;
}

export function hasPermission(context: AuthorizationContext, permissionCode: string): boolean {
  return permissionCode in context.permissions;
}

export function hasRole(context: AuthorizationContext, roleName: string): boolean {
  return context.roles.some((role) => role.name === roleName);
}

/** Canonical internal staff Roles — fixed four-role set. Customer / external identities must never hold these. */
export const INTERNAL_STAFF_ROLES = ["Admin", "Manager", "Team Lead", "Caller"] as const;

/** Supervisory / admin Roles that must keep the full CRM shell. */
export const ELEVATED_STAFF_ROLES = ["Admin", "Manager", "Team Lead"] as const;

/** True when the User holds at least one internal CRM staff Role. */
export function isInternalStaff(context: AuthorizationContext): boolean {
  return context.roles.some((role) =>
    (INTERNAL_STAFF_ROLES as readonly string[]).includes(role.name),
  );
}

/**
 * True when the User is a front-line Caller only (no Admin / Manager / Team Lead).
 * Used to switch to the dedicated Caller Workspace shell and block admin surfaces.
 */
export function isCallerWorkspaceUser(context: AuthorizationContext): boolean {
  const holdsCaller = hasRole(context, "Caller");
  if (!holdsCaller) return false;
  return !context.roles.some((role) =>
    (ELEVATED_STAFF_ROLES as readonly string[]).includes(role.name),
  );
}

export function getPermissionScope(
  context: AuthorizationContext,
  permissionCode: string,
): DataScope | null {
  return context.permissions[permissionCode] ?? null;
}
