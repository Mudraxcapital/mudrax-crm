// ============================================================================
// Resolves the Manager id that must own a newly created business row.
// ============================================================================

import type { AuthorizationContext } from "../../domain/entities/AuthorizationContext";

/**
 * - Manager → self
 * - Team Lead / Caller → hierarchy.ownerManagerId
 * - Admin → optional override, else null (Admin must pass explicit owner when creating)
 */
export function resolveOwnerManagerId(
  authContext: AuthorizationContext,
  explicitOwnerManagerId?: string | null,
): string | null {
  if (explicitOwnerManagerId) return explicitOwnerManagerId;
  if (authContext.hierarchy.primaryRole === "Manager") {
    return authContext.userId;
  }
  return authContext.hierarchy.ownerManagerId;
}

export function requireOwnerManagerId(
  authContext: AuthorizationContext,
  explicitOwnerManagerId?: string | null,
): string {
  const id = resolveOwnerManagerId(authContext, explicitOwnerManagerId);
  if (!id) {
    throw new Error(
      "ownerManagerId is required. Admins must select a Manager; Managers own their own book.",
    );
  }
  return id;
}
