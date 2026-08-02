/** Fixed enterprise roles — mirrored from web RBAC; do not alter grant logic here. */
export const FIXED_ROLES = ["Admin", "Manager", "Team Lead", "Caller"] as const;
export type FixedRole = (typeof FIXED_ROLES)[number];

export const INTERNAL_STAFF_ROLES = FIXED_ROLES;
export const ELEVATED_STAFF_ROLES = ["Admin", "Manager", "Team Lead"] as const;
export type ElevatedStaffRole = (typeof ELEVATED_STAFF_ROLES)[number];
