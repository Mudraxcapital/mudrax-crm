import { ELEVATED_STAFF_ROLES, INTERNAL_STAFF_ROLES } from "../enums/roles";

/** True when the user holds at least one internal CRM staff role. */
export function isInternalStaffFromRoles(roleNames: readonly string[]): boolean {
  return roleNames.some((name) => (INTERNAL_STAFF_ROLES as readonly string[]).includes(name));
}

/**
 * True when the user is a front-line Caller only (no Admin / Manager / Team Lead).
 * Mirrors server `isCallerWorkspaceUser` without hardcoding grants.
 */
export function isCallerWorkspaceFromRoles(roleNames: readonly string[]): boolean {
  const holdsCaller = roleNames.includes("Caller");
  if (!holdsCaller) return false;
  return !roleNames.some((name) => (ELEVATED_STAFF_ROLES as readonly string[]).includes(name));
}

export function hasPermissionCode(
  permissionCodes: readonly string[],
  code: string,
): boolean {
  return permissionCodes.includes(code);
}

export function hasAnyPermission(
  permissionCodes: readonly string[],
  codes: readonly string[],
): boolean {
  if (codes.length === 0) return true;
  const held = new Set(permissionCodes);
  return codes.some((code) => held.has(code));
}

export interface PermissionGatedItem {
  /** Any of these permission codes grants visibility. Empty = visible to all staff. */
  permissions?: readonly string[];
}

/** Filter nav / feature lists by effective permission codes (UI only). */
export function filterByPermissions<T extends PermissionGatedItem>(
  items: readonly T[],
  permissionCodes: readonly string[],
): T[] {
  const held = new Set(permissionCodes);
  return items.filter((item) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((code) => held.has(code));
  });
}
