// ============================================================================
// src/modules/rbac/domain/entities/FixedRoles.ts
//
// Mudrax CRM has exactly four roles. They are fixed in code — users cannot
// create custom roles or edit role definitions.
// ============================================================================

export const FIXED_ROLES = ["Admin", "Manager", "Team Lead", "Caller"] as const;
export type FixedRoleName = (typeof FIXED_ROLES)[number];
