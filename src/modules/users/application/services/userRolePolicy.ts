// ============================================================================
// src/modules/users/application/services/userRolePolicy.ts
// ============================================================================

import {
  FIXED_USER_ROLES,
  type FixedUserRole,
} from "../../domain/entities/User";
import {
  AdminRoleProtectedError,
  InvalidUserRoleError,
} from "../../domain/errors/UserErrors";

export function assertFixedRole(role: string): FixedUserRole {
  if (!(FIXED_USER_ROLES as readonly string[]).includes(role)) {
    throw new InvalidUserRoleError(role);
  }
  return role as FixedUserRole;
}

/** Managers may manage non-Admin users only; Admins may manage anyone. */
export function assertCanAssignRole(actorRoles: string[], targetRole: FixedUserRole): void {
  const actorIsAdmin = actorRoles.includes("Admin");
  if (targetRole === "Admin" && !actorIsAdmin) {
    throw new AdminRoleProtectedError("Only Admins can assign the Admin role.");
  }
}

export function assertCanManageTarget(
  actorRoles: string[],
  targetRole: FixedUserRole | null,
): void {
  const actorIsAdmin = actorRoles.includes("Admin");
  if (targetRole === "Admin" && !actorIsAdmin) {
    throw new AdminRoleProtectedError();
  }
}
