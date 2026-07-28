// ============================================================================
// Grant resolution for the Team Lead "manage Caller accounts" flag.
// Kept free of value imports from @/modules/rbac so create/update user
// unit tests do not load the Prisma-backed RBAC barrel.
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { FixedUserRole } from "../../domain/entities/User";
import { InvalidUserHierarchyError } from "../../domain/errors/UserErrors";

/** Admin/Manager may grant the flag when creating or editing a Team Lead. */
export function resolveCanManageCallerAccountsForUser(input: {
  role: FixedUserRole;
  requested: boolean | undefined;
  actorRoles: string[];
  hierarchy: HierarchyScope;
}): boolean {
  if (input.role !== "Team Lead") return false;
  const actorIsAdminOrManager =
    input.actorRoles.includes("Admin") ||
    input.actorRoles.includes("Manager") ||
    input.hierarchy.primaryRole === "Admin" ||
    input.hierarchy.primaryRole === "Manager";
  if (!actorIsAdminOrManager) return false;
  return input.requested === true;
}

export function assertActorGrantedCallerLifecycle(input: {
  actorCanManageCallerAccounts: boolean;
  hierarchyPrimaryRole: string | null;
  action: "delete" | "change_status";
}): void {
  const { actorCanManageCallerAccounts, hierarchyPrimaryRole, action } = input;
  if (hierarchyPrimaryRole !== "Team Lead") return;
  if (actorCanManageCallerAccounts) return;
  throw new InvalidUserHierarchyError(
    action === "delete"
      ? "Your Team Lead account is not permitted to delete Caller accounts. Ask your Manager or Admin to grant Caller account management."
      : "Your Team Lead account is not permitted to disable or suspend Caller accounts. Ask your Manager or Admin to grant Caller account management.",
  );
}
