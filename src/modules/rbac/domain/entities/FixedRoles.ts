// ============================================================================
// src/modules/rbac/domain/entities/FixedRoles.ts
//
// Mudrax CRM has exactly four roles. They are fixed in code — users cannot
// create custom roles or edit role definitions.
// ============================================================================

export const FIXED_ROLES = ["Admin", "Manager", "Team Lead", "Caller"] as const;
export type FixedRoleName = (typeof FIXED_ROLES)[number];

/** Roles that can be enrolled on campaigns and receive lead assignments / take calls. */
export const ASSIGNABLE_AGENT_ROLES = ["Admin", "Manager", "Team Lead", "Caller"] as const;
export type AssignableAgentRole = (typeof ASSIGNABLE_AGENT_ROLES)[number];

export function isAssignableAgentRole(
  role: string | null | undefined,
): role is AssignableAgentRole {
  return !!role && (ASSIGNABLE_AGENT_ROLES as readonly string[]).includes(role);
}
