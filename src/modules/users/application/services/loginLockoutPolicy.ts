// ============================================================================
// Login lockout — Managers, Team Leads, and Callers are suspended after
// repeated failed password attempts. Admins are not account-suspended here
// (single-Admin recovery); they use Redis temporary cooldown in
// src/modules/auth/application/services/adminLoginProtection.ts instead.
// Recovery for suspended roles: Admin password reset.
// ============================================================================

export const LOGIN_LOCKOUT_THRESHOLD = 5;

export const LOGIN_LOCKOUT_REASON =
  "Suspended after 5 failed login attempts. Contact an Admin for a password reset.";

const LOCKOUT_ROLES = ["Manager", "Team Lead", "Caller"] as const;

export function roleSubjectToLoginLockout(role: string | null | undefined): boolean {
  if (!role) return false;
  return (LOCKOUT_ROLES as readonly string[]).includes(role);
}
