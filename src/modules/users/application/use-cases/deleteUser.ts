// ============================================================================
// src/modules/users/application/use-cases/deleteUser.ts
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import type { User } from "../../domain/entities/User";
import type { FixedUserRole } from "../../domain/entities/User";
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
import { assertReassignmentTargetsNotInDeleteSet } from "../services/deleteReassignmentPolicy";
import {
  assertActorMayReassignCallersToDirectAdmin,
  isDirectAdminCallerReassignment,
} from "../services/callerReassignment";

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

export async function assertDeleteUserPreconditions(
  command: DeleteUserCommand,
  repository: UserRepository,
  roles: RoleAssignmentPort,
  leadOwnership: LeadOwnershipPort,
): Promise<{ user: User; targetRole: FixedUserRole | null }> {
  const {
    userId,
    actorRoles,
    hierarchy,
    actor,
    reassignCallersToTeamLeadId,
    reassignTeamLeadsToManagerId,
    reassignLeadsToUserId,
  } = command;

  if (actor.actorId === userId) throw new CannotDeleteSelfError();

  const actorUser =
    actor.actorId && actor.actorId !== userId
      ? await repository.findById(actor.actorId)
      : null;

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
    actorCanManageCallerAccounts: actorUser?.canManageCallerAccounts ?? false,
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
    const [teamLeadCount, campaignCount] = await Promise.all([
      repository.countTeamLeadsForManager(userId),
      repository.countCampaignsForManager(userId),
    ]);
    const needsManagerTarget = teamLeadCount > 0 || campaignCount > 0;
    if (needsManagerTarget) {
      if (!reassignTeamLeadsToManagerId) {
        const parts: string[] = [];
        if (teamLeadCount > 0) {
          parts.push(`${teamLeadCount} Team Lead(s)`);
        }
        if (campaignCount > 0) {
          parts.push(`${campaignCount} Campaign(s)`);
        }
        throw new UserDeleteBlockedError(
          `This Manager has ${parts.join(" and ")}. Reassign them to another Manager before deleting.`,
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
          `This Team Lead has ${callerCount} Caller(s). Reassign them to another Team Lead or Direct Admin before deleting.`,
        );
      }
      if (isDirectAdminCallerReassignment(reassignCallersToTeamLeadId)) {
        assertActorMayReassignCallersToDirectAdmin({ actorRoles, hierarchy });
      } else {
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
  }

  const [leadCount, followUpCount] = await Promise.all([
    leadOwnership.countAssignedLeads(userId),
    leadOwnership.countAssignedFollowUps(userId),
  ]);
  if (leadCount > 0 || followUpCount > 0) {
    if (!reassignLeadsToUserId) {
      const parts: string[] = [];
      if (leadCount > 0) parts.push(`${leadCount} assigned Lead(s)`);
      if (followUpCount > 0) parts.push(`${followUpCount} Follow-up(s)`);
      throw new UserDeleteBlockedError(
        `This employee has ${parts.join(" and ")}. Reassign those before deleting.`,
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

  return { user, targetRole };
}

export function makeDeleteUser(
  repository: UserRepository,
  roles: RoleAssignmentPort,
  leadOwnership: LeadOwnershipPort,
) {
  return async function deleteUser(command: DeleteUserCommand): Promise<void> {
    const { targetRole } = await assertDeleteUserPreconditions(
      command,
      repository,
      roles,
      leadOwnership,
    );

    await repository.deleteAtomically({
      userId: command.userId,
      actor: command.actor,
      correlationId: command.correlationId,
      targetRole,
      reassignCallersToTeamLeadId: command.reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId: command.reassignTeamLeadsToManagerId,
      reassignLeadsToUserId: command.reassignLeadsToUserId,
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
  reassignCallersToTeamLeadId?: string | null;
  reassignTeamLeadsToManagerId?: string | null;
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

    assertReassignmentTargetsNotInDeleteSet({
      userIds,
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
    });

    const preflightErrors: BulkDeleteItemResult[] = [];
    const preflighted: Array<{ userId: string; targetRole: FixedUserRole | null; fullName?: string }> =
      [];

    for (const id of userIds) {
      const summary = await repository.findSummaryById(id);
      try {
        const { targetRole } = await assertDeleteUserPreconditions(
          {
            userId: id,
            actorRoles,
            hierarchy,
            actor,
            reassignCallersToTeamLeadId,
            reassignTeamLeadsToManagerId,
            reassignLeadsToUserId,
            correlationId,
          },
          repository,
          roles,
          leadOwnership,
        );
        preflighted.push({ userId: id, targetRole, fullName: summary?.fullName });
      } catch (error) {
        if (
          error instanceof UserDeleteBlockedError ||
          error instanceof InvalidUserHierarchyError ||
          error instanceof AdminRoleProtectedError ||
          error instanceof CannotDeleteSelfError ||
          error instanceof UserNotFoundError
        ) {
          preflightErrors.push({
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

    if (preflightErrors.length > 0) {
      throw new UserDeleteBlockedError(
        preflightErrors.map((row) => `${row.fullName ?? row.userId}: ${row.error}`).join(" "),
      );
    }

    if (preflighted.length === 0) {
      throw new UserDeleteBlockedError("No users selected for deletion.");
    }

    await repository.bulkDeleteAtomically({
      deletes: preflighted.map((row) => ({
        userId: row.userId,
        targetRole: row.targetRole,
      })),
      actor,
      correlationId,
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
    });

    return {
      deleted: preflighted.length,
      results: preflighted.map((row) => ({
        userId: row.userId,
        fullName: row.fullName,
        ok: true,
      })),
    };
  };
}
