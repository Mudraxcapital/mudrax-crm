// ============================================================================
// Shared ACTIVE + role + hierarchy checks for reporting / reassignment targets.
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import { InvalidUserHierarchyError } from "../../domain/errors/UserErrors";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";

export async function assertActiveHierarchyTarget(input: {
  repository: UserRepository;
  roles: RoleAssignmentPort;
  userId: string;
  expectedRoles: string[];
  label: string;
  hierarchy?: HierarchyScope;
}): Promise<void> {
  const user = await input.repository.findById(input.userId);
  const role = user ? await input.roles.getPrimaryRoleName(user.id) : null;
  if (!user || user.status !== "ACTIVE" || !role || !input.expectedRoles.includes(role)) {
    throw new InvalidUserHierarchyError(
      `${input.label} must be an active ${input.expectedRoles.join(" or ")}.`,
    );
  }
  if (
    input.hierarchy?.visibleUserIds &&
    !input.hierarchy.visibleUserIds.includes(input.userId) &&
    input.hierarchy.primaryRole !== "Admin"
  ) {
    throw new InvalidUserHierarchyError(`${input.label} must be inside your hierarchy.`);
  }
}
