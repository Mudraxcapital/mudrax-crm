// ============================================================================
// src/modules/users/application/use-cases/changeAccountStatus.ts
//
// Centralized Enable / Disable / Suspend for hierarchical User Management.
// Always bumps sessionVersion so every JWT / remember-me cookie is invalid.
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { UserStatus } from "../../domain/entities/User";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import {
  AdminRoleProtectedError,
  InvalidUserHierarchyError,
  LastActiveAdminError,
  UserNotFoundError,
} from "../../domain/errors/UserErrors";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import { assertCanActOnHierarchyTarget } from "../services/userHierarchyPolicy";
import { assertKeepsActiveAdmin } from "../services/lastAdminPolicy";

export interface ChangeAccountStatusCommand {
  userId: string;
  status: UserStatus;
  reason?: string | null;
  forceLogout?: boolean;
  ipAddress?: string | null;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  correlationId?: string | null;
}

export interface BulkChangeAccountStatusCommand {
  userIds: string[];
  status: UserStatus;
  reason?: string | null;
  forceLogout?: boolean;
  ipAddress?: string | null;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  correlationId?: string | null;
}

function assertActorMayChangeStatus(actorRoles: string[], hierarchy: HierarchyScope): void {
  if (hierarchy.primaryRole === "Caller") {
    throw new InvalidUserHierarchyError("Callers cannot modify account status.");
  }
  if (
    !actorRoles.includes("Admin") &&
    hierarchy.primaryRole !== "Admin" &&
    hierarchy.primaryRole !== "Manager" &&
    hierarchy.primaryRole !== "Team Lead"
  ) {
    throw new InvalidUserHierarchyError("You cannot modify account status.");
  }
}

export function makeChangeAccountStatus(repository: UserRepository, roles: RoleAssignmentPort) {
  return async function changeAccountStatus(
    command: ChangeAccountStatusCommand,
  ): Promise<{ userId: string; status: UserStatus }> {
    const {
      userId,
      status,
      reason,
      forceLogout = true,
      ipAddress,
      actorRoles,
      hierarchy,
      actor,
      correlationId,
    } = command;

    assertActorMayChangeStatus(actorRoles, hierarchy);

    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const targetRole = await roles.getPrimaryRoleName(userId);
    assertCanActOnHierarchyTarget({
      hierarchy,
      actorRoles,
      actorUserId: actor.actorId ?? "",
      targetUserId: userId,
      targetRole,
      action: "change_status",
    });

    await assertKeepsActiveAdmin({
      repository,
      target: user,
      targetRole,
      nextStatus: status,
    });

    if (user.status === status) {
      return { userId, status };
    }

    const count = await repository.bulkSetStatusWithAudit(
      [userId],
      status,
      actor,
      correlationId,
      { reason, ipAddress, forceLogout },
    );
    if (count === 0) {
      throw new AdminRoleProtectedError("Unable to change account status.");
    }
    return { userId, status };
  };
}

export function makeBulkChangeAccountStatus(
  repository: UserRepository,
  roles: RoleAssignmentPort,
) {
  return async function bulkChangeAccountStatus(
    command: BulkChangeAccountStatusCommand,
  ): Promise<number> {
    const {
      userIds,
      status,
      reason,
      forceLogout = true,
      ipAddress,
      actorRoles,
      hierarchy,
      actor,
      correlationId,
    } = command;

    assertActorMayChangeStatus(actorRoles, hierarchy);
    const allowed: string[] = [];

    for (const id of userIds) {
      const user = await repository.findById(id);
      if (!user) continue;
      const role = await roles.getPrimaryRoleName(id);
      try {
        assertCanActOnHierarchyTarget({
          hierarchy,
          actorRoles,
          actorUserId: actor.actorId ?? "",
          targetUserId: id,
          targetRole: role,
          action: "change_status",
        });
        await assertKeepsActiveAdmin({
          repository,
          target: user,
          targetRole: role,
          nextStatus: status,
        });
        allowed.push(id);
      } catch (error) {
        if (
          error instanceof LastActiveAdminError ||
          error instanceof AdminRoleProtectedError ||
          error instanceof InvalidUserHierarchyError
        ) {
          continue;
        }
        throw error;
      }
    }

    if (allowed.length === 0) return 0;
    return repository.bulkSetStatusWithAudit(allowed, status, actor, correlationId, {
      reason,
      ipAddress,
      forceLogout,
    });
  };
}
