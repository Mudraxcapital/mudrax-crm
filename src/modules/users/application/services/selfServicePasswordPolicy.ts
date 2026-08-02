// ============================================================================
// Self-service password change — Admin only.
// Managers, Team Leads, and Callers use administrator-assigned credentials.
// ============================================================================

import type { FixedUserRole } from "../../domain/entities/User";

const SELF_SERVICE_PASSWORD_ROLES: readonly FixedUserRole[] = ["Admin"];

export function roleMaySelfServiceChangePassword(role: string | null | undefined): boolean {
  if (!role) return false;
  return (SELF_SERVICE_PASSWORD_ROLES as readonly string[]).includes(role);
}

export function adminAssignedPasswordRole(role: string | null | undefined): boolean {
  return role === "Manager" || role === "Caller" || role === "Team Lead";
}
