// ============================================================================
// Self-service password change is limited to Admin and Manager roles.
// Team Leads and Callers use administrator-assigned credentials only.
// ============================================================================

import type { FixedUserRole } from "../../domain/entities/User";

const SELF_SERVICE_PASSWORD_ROLES: readonly FixedUserRole[] = ["Admin", "Manager"];

export function roleMaySelfServiceChangePassword(role: string | null | undefined): boolean {
  if (!role) return false;
  return (SELF_SERVICE_PASSWORD_ROLES as readonly string[]).includes(role);
}

export function adminAssignedPasswordRole(role: string | null | undefined): boolean {
  return role === "Team Lead" || role === "Caller";
}
