// ============================================================================
// Self-service password change — available to every fixed role.
// Managers, Team Leads, and Callers are also forced to change temporary
// passwords set on create / Admin reset (mustChangePassword).
// ============================================================================

import { FIXED_USER_ROLES, type FixedUserRole } from "../../domain/entities/User";

const SELF_SERVICE_PASSWORD_ROLES: readonly FixedUserRole[] = FIXED_USER_ROLES;

/** Roles that receive administrator-assigned passwords and must change them. */
export function adminAssignedPasswordRole(role: string | null | undefined): boolean {
  return role === "Manager" || role === "Caller" || role === "Team Lead";
}

export function roleMaySelfServiceChangePassword(role: string | null | undefined): boolean {
  if (!role) return false;
  return (SELF_SERVICE_PASSWORD_ROLES as readonly string[]).includes(role);
}

/** Paths reachable while mustChangePassword is true (web). */
export function isForcedPasswordChangeAllowedPath(pathname: string): boolean {
  const allowedPrefixes = [
    "/change-password",
    "/login",
    "/session-expired",
    "/clear-session",
    "/api/auth",
    "/api/caller/password",
    "/api/health",
    "/api/ready",
    "/api/live",
  ] as const;

  return allowedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
