// ============================================================================
// Caller reassignment when deleting or demoting a Team Lead.
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import { InvalidUserHierarchyError } from "../../domain/errors/UserErrors";
import {
  DIRECT_ADMIN_REASSIGN_LABEL,
  REASSIGN_CALLERS_TO_DIRECT_ADMIN,
} from "../../presentation/constants/callerReassignment";

export { DIRECT_ADMIN_REASSIGN_LABEL, REASSIGN_CALLERS_TO_DIRECT_ADMIN };

export function isDirectAdminCallerReassignment(
  value: string | null | undefined,
): value is typeof REASSIGN_CALLERS_TO_DIRECT_ADMIN {
  return value === REASSIGN_CALLERS_TO_DIRECT_ADMIN;
}

export function assertActorMayReassignCallersToDirectAdmin(input: {
  actorRoles: string[];
  hierarchy: HierarchyScope;
}): void {
  const allowed =
    input.actorRoles.includes("Admin") || input.hierarchy.primaryRole === "Admin";
  if (!allowed) {
    throw new InvalidUserHierarchyError(
      "Only an Admin can reassign Callers to Direct Admin.",
    );
  }
}
