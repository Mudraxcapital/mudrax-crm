// ============================================================================
// src/modules/users/application/use-cases/deleteUser.ts
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import {
  AdminRoleProtectedError,
  CannotDeleteSelfError,
  InvalidUserHierarchyError,
  UserDeleteBlockedError,
  UserNotFoundError,
} from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import type { LeadOwnershipPort } from "../ports/LeadOwnershipPort";
import { assertCanManageTarget } from "../services/userRolePolicy";
import { assertCanActOnHierarchyTarget } from "../services/userHierarchyPolicy";
import { assertKeepsActiveAdmin } from "../services/lastAdminPolicy";
import { assertActiveHierarchyTarget } from "../services/activeHierarchyTarget";

export interface DeleteUserCommand {
  userId: string;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  /** Required when deleting a Team Lead who still has Callers. */
  reassignCallersToTeamLeadId?: string | null;
  /** Required when deleting a Manager who still has Team Leads. */
  reassignTeamLeadsToManagerId?: string | null;
  /** Required when the user still owns assigned Leads. */
  reassignLeadsToUserId?: string | null;
  correlationId?: string | null;
}

export function makeDeleteUser(
  repository: UserRepository,
  roles: RoleAssignmentPort,
  leadOwnership: LeadOwnershipPort,
) {
  return async function deleteUser(command: DeleteUserCommand): Promise<void> {
    const {
      userId,
      actorRoles,
      hierarchy,
      actor,
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
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

    // Pre-validate reassignment targets; execution is all-or-nothing in deleteAtomically.
    if (targetRole === "Manager") {
      const teamLeadCount = await repository.countTeamLeadsForManager(userId);
      if (teamLeadCount > 0) {
        if (!reassignTeamLeadsToManagerId) {
          throw new UserDeleteBlockedError(
            `This Manager has ${teamLeadCount} Team Lead(s). Reassign them to another Manager before deleting.`,
          );
        }
        if (reassignTeamLeadsToManagerId === userId) {
          throw new InvalidUserHierarchyError(
            "Choose a different Manager to receive the Team Leads.",
          );
        }
        await assertActiveHierarchyTarget({
          repository,
          roles,
          userId: reassignTeamLeadsToManagerId,
          expectedRoles: ["Manager", "Admin"],
          label: "Reassignment Manager",
          hierarchy,
        });
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
        await assertActiveHierarchyTarget({
          repository,
          roles,
          userId: reassignCallersToTeamLeadId,
          expectedRoles: ["Team Lead"],
          label: "Reassignment Team Lead",
          hierarchy,
        });
      }
    }

    const leadCount = await leadOwnership.countAssignedLeads(userId);
    if (leadCount > 0) {
      if (!reassignLeadsToUserId) {
        throw new UserDeleteBlockedError(
          `This employee has ${leadCount} assigned Lead(s). Reassign those Leads before deleting.`,
        );
      }
      if (reassignLeadsToUserId === userId) {
        throw new InvalidUserHierarchyError(
          "Choose a different employee to receive the Leads.",
        );
      }
      await assertActiveHierarchyTarget({
        repository,
        roles,
        userId: reassignLeadsToUserId,
        expectedRoles: ["Caller", "Team Lead", "Manager", "Admin"],
        label: "Lead reassignment target",
        hierarchy,
      });
    }

    await repository.deleteAtomically({
      userId,
      actor,
      correlationId,
      targetRole,
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
    });
  };
}

export interface BulkDeleteItemResult {
  userId: string;
  fullName?: string;
  ok: boolean;
  error?: string;
}

export interface BulkDeleteCommand {
  userIds: string[];
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  /** Shared Team Lead target when deleting Team Leads that own Callers. */
  reassignCallersToTeamLeadId?: string | null;
  /** Shared Manager target when deleting Managers that own Team Leads. */
  reassignTeamLeadsToManagerId?: string | null;
  /** Shared lead assignee when deleting users that own Leads. */
  reassignLeadsToUserId?: string | null;
  correlationId?: string | null;
}

export function makeBulkDeleteUsers(
  repository: UserRepository,
  roles: RoleAssignmentPort,
  leadOwnership: LeadOwnershipPort,
) {
  return async function bulkDeleteUsers(command: BulkDeleteCommand): Promise<{
    deleted: number;
    results: BulkDeleteItemResult[];
  }> {
    const {
      userIds,
      actorRoles,
      hierarchy,
      actor,
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
      correlationId,
    } = command;
    const results: BulkDeleteItemResult[] = [];
    let deleted = 0;
    const deleteOne = makeDeleteUser(repository, roles, leadOwnership);

    for (const id of userIds) {
      const summary = await repository.findSummaryById(id);
      try {
        await deleteOne({
          userId: id,
          actorRoles,
          hierarchy,
          actor,
          reassignCallersToTeamLeadId,
          reassignTeamLeadsToManagerId,
          reassignLeadsToUserId,
          correlationId,
        });
        deleted += 1;
        results.push({ userId: id, fullName: summary?.fullName, ok: true });
      } catch (error) {
        if (
          error instanceof UserDeleteBlockedError ||
          error instanceof InvalidUserHierarchyError ||
          error instanceof AdminRoleProtectedError ||
          error instanceof CannotDeleteSelfError ||
          error instanceof UserNotFoundError
        ) {
          results.push({
            userId: id,
            fullName: summary?.fullName,
            ok: false,
            error: error.message,
          });
          continue;
        }
        throw error;
      }
    }

    if (deleted === 0) {
      throw new UserDeleteBlockedError(
        results.find((row) => row.error)?.error ??
          "No deletable users. Provide reassignment targets where required.",
      );
    }
    return { deleted, results };
  };
}
