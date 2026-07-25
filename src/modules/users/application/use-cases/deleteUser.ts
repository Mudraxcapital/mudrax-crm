// ============================================================================
// src/modules/users/application/use-cases/deleteUser.ts
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import type { UserStatus } from "../../domain/entities/User";
import {
  AdminRoleProtectedError,
  CannotDeleteSelfError,
  InvalidUserHierarchyError,
  UserDeleteBlockedError,
  UserNotFoundError,
} from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import { assertCanManageTarget } from "../services/userRolePolicy";
import { assertCanActOnHierarchyTarget } from "../services/userHierarchyPolicy";
import { assertKeepsActiveAdmin } from "../services/lastAdminPolicy";

export interface DeleteUserCommand {
  userId: string;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  /** Required when deleting a Team Lead who still has Callers. */
  reassignCallersToTeamLeadId?: string | null;
  correlationId?: string | null;
}

export function makeDeleteUser(repository: UserRepository, roles: RoleAssignmentPort) {
  return async function deleteUser(command: DeleteUserCommand): Promise<void> {
    const {
      userId,
      actorRoles,
      hierarchy,
      actor,
      reassignCallersToTeamLeadId,
      correlationId,
    } = command;
    if (actor.actorId === userId) throw new CannotDeleteSelfError();

    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const targetRole = await roles.getPrimaryRoleName(userId);
    assertCanManageTarget(actorRoles, targetRole);
    assertCanActOnHierarchyTarget({
      hierarchy,
      actorRoles,
      actorUserId: actor.actorId ?? "",
      targetUserId: userId,
      targetRole,
      action: "delete",
    });

    await assertKeepsActiveAdmin({
      repository,
      target: user,
      targetRole,
      deleting: true,
    });

    const apiKeys = await repository.countApiKeysForUser(userId);
    if (apiKeys > 0) {
      throw new UserDeleteBlockedError(
        "Cannot delete this user while active API keys exist. Revoke API keys first.",
      );
    }

    if (targetRole === "Manager") {
      const teamLeadCount = await repository.countTeamLeadsForManager(userId);
      if (teamLeadCount > 0) {
        throw new UserDeleteBlockedError(
          `Cannot delete this Manager while ${teamLeadCount} Team Lead(s) still report to them. Reassign those Team Leads first.`,
        );
      }
    }

    if (targetRole === "Team Lead") {
      const callerCount = await repository.countCallersForTeamLead(userId);
      if (callerCount > 0) {
        if (!reassignCallersToTeamLeadId) {
          throw new UserDeleteBlockedError(
            `This Team Lead has ${callerCount} Caller(s). Reassign them to another Team Lead before deleting.`,
          );
        }
        if (reassignCallersToTeamLeadId === userId) {
          throw new InvalidUserHierarchyError(
            "Choose a different Team Lead to receive the Callers.",
          );
        }
        const replacement = await repository.findById(reassignCallersToTeamLeadId);
        const replacementRole = replacement
          ? await roles.getPrimaryRoleName(reassignCallersToTeamLeadId)
          : null;
        if (
          !replacement ||
          replacement.status !== "ACTIVE" ||
          replacementRole !== "Team Lead"
        ) {
          throw new InvalidUserHierarchyError(
            "Reassignment target must be an active Team Lead.",
          );
        }
        if (
          hierarchy.visibleUserIds &&
          !hierarchy.visibleUserIds.includes(reassignCallersToTeamLeadId) &&
          hierarchy.primaryRole !== "Admin"
        ) {
          throw new InvalidUserHierarchyError(
            "Reassignment target must be a Team Lead inside your hierarchy.",
          );
        }
        await repository.reassignCallersToTeamLead(userId, reassignCallersToTeamLeadId);
        await repository.appendAudit(
          userId,
          "Callers Reassigned",
          actor,
          { callerCount },
          { reassignCallersToTeamLeadId, callerCount },
          correlationId,
        );
      }
    }

    await repository.deleteWithAudit(userId, actor, correlationId);
  };
}

export interface BulkStatusCommand {
  userIds: string[];
  status: UserStatus;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  correlationId?: string | null;
}

export function makeBulkSetUserStatus(repository: UserRepository, roles: RoleAssignmentPort) {
  return async function bulkSetUserStatus(command: BulkStatusCommand): Promise<number> {
    const { userIds, status, actorRoles, hierarchy, actor, correlationId } = command;
    const allowed: string[] = [];

    for (const id of userIds) {
      if (actor.actorId === id) continue;
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
      } catch {
        // Skip users outside hierarchy / protected roles / last admin.
      }
    }

    if (allowed.length === 0) return 0;
    return repository.bulkSetStatusWithAudit(allowed, status, actor, correlationId);
  };
}

export interface BulkDeleteCommand {
  userIds: string[];
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  correlationId?: string | null;
}

export function makeBulkDeleteUsers(repository: UserRepository, roles: RoleAssignmentPort) {
  return async function bulkDeleteUsers(command: BulkDeleteCommand): Promise<number> {
    const { userIds, actorRoles, hierarchy, actor, correlationId } = command;
    let count = 0;
    const errors: string[] = [];

    for (const id of userIds) {
      try {
        await makeDeleteUser(repository, roles)({
          userId: id,
          actorRoles,
          hierarchy,
          actor,
          correlationId,
        });
        count += 1;
      } catch (error) {
        if (
          error instanceof UserDeleteBlockedError ||
          error instanceof InvalidUserHierarchyError ||
          error instanceof AdminRoleProtectedError ||
          error instanceof CannotDeleteSelfError
        ) {
          errors.push(error.message);
          continue;
        }
        throw error;
      }
    }

    if (count === 0) {
      throw new UserDeleteBlockedError(
        errors[0] ?? "No deletable users in your hierarchy. Team Leads with Callers need reassignment.",
      );
    }
    return count;
  };
}
