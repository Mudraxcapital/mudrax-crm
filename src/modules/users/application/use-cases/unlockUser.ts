// ============================================================================
// Admin unlock after failed-login lockout.
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import {
  AdminRoleProtectedError,
  InvalidUserHierarchyError,
  UserNotFoundError,
} from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import { assertCanActOnHierarchyTarget } from "../services/userHierarchyPolicy";

export function makeUnlockUser(repository: UserRepository, roles: RoleAssignmentPort) {
  return async function unlockUser(input: {
    userId: string;
    actorRoles: string[];
    hierarchy: HierarchyScope;
    actor: UserAuditActor;
    ipAddress?: string | null;
  }): Promise<void> {
    if (!input.actorRoles.includes("Admin") && input.hierarchy.primaryRole !== "Admin") {
      throw new AdminRoleProtectedError("Only Admins can unlock accounts.");
    }

    const user = await repository.findById(input.userId);
    if (!user) throw new UserNotFoundError(input.userId);

    const targetRole = await roles.getPrimaryRoleName(input.userId);
    assertCanActOnHierarchyTarget({
      hierarchy: input.hierarchy,
      actorRoles: input.actorRoles,
      actorUserId: input.actor.actorId ?? "",
      targetUserId: input.userId,
      targetRole,
      action: "change_status",
    });

    if (!user.lockedUntil || user.lockedUntil.getTime() <= Date.now()) {
      throw new InvalidUserHierarchyError("This account is not locked.");
    }

    await repository.unlockAccount(input.userId, input.actor, input.ipAddress);
  };
}
