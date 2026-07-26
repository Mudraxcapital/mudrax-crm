// ============================================================================
// src/modules/users/application/use-cases/updateUser.ts
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import {
  DuplicateUserEmailError,
  DuplicateUserPhoneError,
  InvalidUserHierarchyError,
  UserDeleteBlockedError,
  UserNotFoundError,
} from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import type { LeadOwnershipPort } from "../ports/LeadOwnershipPort";
import type { UpdateUserInput } from "../validators/userSchemas";
import {
  assertCanAssignRole,
  assertCanManageTarget,
  assertFixedRole,
} from "../services/userRolePolicy";
import {
  assertCanActOnHierarchyTarget,
  assertCanCreateRole,
  assertValidReportingManagerRole,
  normalizeHierarchyOnUpdate,
} from "../services/userHierarchyPolicy";
import { assertKeepsActiveAdmin } from "../services/lastAdminPolicy";
import { assertActiveHierarchyTarget } from "../services/activeHierarchyTarget";
import { toUserDto, type UserDto } from "../dto/UserDto";

export interface UpdateUserCommand {
  userId: string;
  input: UpdateUserInput;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  correlationId?: string | null;
}

export function makeUpdateUser(
  repository: UserRepository,
  roles: RoleAssignmentPort,
  leadOwnership: LeadOwnershipPort,
) {
  return async function updateUser(command: UpdateUserCommand): Promise<UserDto> {
    const { userId, input, actorRoles, hierarchy, actor, correlationId } = command;
    const existing = await repository.findById(userId);
    if (!existing) throw new UserNotFoundError(userId);

    const currentRole = await roles.getPrimaryRoleName(userId);
    assertCanManageTarget(actorRoles, currentRole);
    assertCanActOnHierarchyTarget({
      hierarchy,
      actorRoles,
      actorUserId: actor.actorId ?? "",
      targetUserId: userId,
      targetRole: currentRole,
      action: "edit",
    });

    let nextRole = currentRole;
    if (input.role) {
      nextRole = assertFixedRole(input.role);
      assertCanAssignRole(actorRoles, nextRole);
      if (nextRole !== currentRole) {
        assertCanCreateRole(actorRoles, hierarchy, nextRole);
      }
    }

    if (!nextRole) {
      throw new InvalidUserHierarchyError("User must have a fixed role.");
    }

    const roleChanged = nextRole !== currentRole;
    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const actorIsAdmin =
      actorRoles.includes("Admin") || hierarchy.primaryRole === "Admin";

    if (actor.actorId === userId) {
      if (roleChanged) {
        throw new InvalidUserHierarchyError("You cannot change your own role.");
      }
      if (statusChanged) {
        throw new InvalidUserHierarchyError("You cannot change your own account status.");
      }
      if (
        input.assignedTeamLeadId !== undefined ||
        input.reportingManagerId !== undefined
      ) {
        throw new InvalidUserHierarchyError("You cannot change your own reporting hierarchy.");
      }
      if (input.email !== undefined && input.email.toLowerCase() !== existing.email) {
        throw new InvalidUserHierarchyError(
          "You cannot change your own email. Ask an Admin via User Management.",
        );
      }
    }

    // Email is Admin-only through User Management (never self-service).
    let nextEmail: string | undefined;
    if (input.email !== undefined) {
      const normalizedEmail = input.email.toLowerCase();
      if (normalizedEmail !== existing.email) {
        if (!actorIsAdmin) {
          throw new InvalidUserHierarchyError(
            "Only Admins can change employee email addresses.",
          );
        }
        const clash = await repository.findByEmail(normalizedEmail);
        if (clash && clash.id !== userId) throw new DuplicateUserEmailError(input.email);
        nextEmail = normalizedEmail;
      }
    }

    await assertKeepsActiveAdmin({
      repository,
      target: existing,
      targetRole: currentRole,
      nextStatus: input.status,
      nextRole,
    });

    // Pre-validate hierarchy reassignment targets (execution is atomic below).
    let reassignCallersToTeamLeadId: string | null = null;
    let reassignTeamLeadsToManagerId: string | null = null;
    let reassignLeadsToUserId: string | null = null;

    if (roleChanged && currentRole === "Manager" && nextRole !== "Manager") {
      const teamLeadCount = await repository.countTeamLeadsForManager(userId);
      if (teamLeadCount > 0) {
        const targetManagerId = input.reassignTeamLeadsToManagerId || null;
        if (!targetManagerId) {
          throw new UserDeleteBlockedError(
            `This Manager has ${teamLeadCount} Team Lead(s). Reassign them to another Manager before changing the role.`,
          );
        }
        if (targetManagerId === userId) {
          throw new InvalidUserHierarchyError(
            "Choose a different Manager to receive the Team Leads.",
          );
        }
        await assertActiveHierarchyTarget({
          repository,
          roles,
          userId: targetManagerId,
          expectedRoles: ["Manager", "Admin"],
          label: "Reassignment Manager",
          hierarchy,
        });
        reassignTeamLeadsToManagerId = targetManagerId;
      }
    }

    if (roleChanged && currentRole === "Team Lead" && nextRole !== "Team Lead") {
      const callerCount = await repository.countCallersForTeamLead(userId);
      if (callerCount > 0) {
        const targetLeadId = input.reassignCallersToTeamLeadId || null;
        if (!targetLeadId) {
          throw new UserDeleteBlockedError(
            `This Team Lead has ${callerCount} Caller(s). Reassign them to another Team Lead before changing the role.`,
          );
        }
        if (targetLeadId === userId) {
          throw new InvalidUserHierarchyError(
            "Choose a different Team Lead to receive the Callers.",
          );
        }
        await assertActiveHierarchyTarget({
          repository,
          roles,
          userId: targetLeadId,
          expectedRoles: ["Team Lead"],
          label: "Reassignment Team Lead",
          hierarchy,
        });
        reassignCallersToTeamLeadId = targetLeadId;
      }
    }

    if (roleChanged) {
      const leadCount = await leadOwnership.countAssignedLeads(userId);
      if (leadCount > 0) {
        const targetLeadOwnerId = input.reassignLeadsToUserId || null;
        if (!targetLeadOwnerId) {
          throw new UserDeleteBlockedError(
            `This employee has ${leadCount} assigned Lead(s). Reassign those Leads before changing the role.`,
          );
        }
        if (targetLeadOwnerId === userId) {
          throw new InvalidUserHierarchyError(
            "Choose a different employee to receive the Leads.",
          );
        }
        await assertActiveHierarchyTarget({
          repository,
          roles,
          userId: targetLeadOwnerId,
          expectedRoles: ["Caller", "Team Lead", "Manager", "Admin"],
          label: "Lead reassignment target",
          hierarchy,
        });
        reassignLeadsToUserId = targetLeadOwnerId;
      }
    }

    if (input.phone !== undefined) {
      const phone = input.phone?.trim() || null;
      if (phone && phone !== existing.phone) {
        const clash = await repository.findByPhone(phone);
        if (clash && clash.id !== userId) throw new DuplicateUserPhoneError(phone);
      }
    }

    const normalized = normalizeHierarchyOnUpdate({
      role: nextRole,
      hierarchy,
      actorUserId: actor.actorId ?? userId,
      assignedTeamLeadId:
        input.assignedTeamLeadId === undefined
          ? existing.assignedTeamLeadId
          : input.assignedTeamLeadId || null,
      reportingManagerId:
        input.reportingManagerId === undefined
          ? existing.reportingManagerId
          : input.reportingManagerId || null,
    });
    const assignedTeamLeadId = nextRole === "Caller" ? normalized.assignedTeamLeadId : null;
    const reportingManagerId = nextRole === "Team Lead" ? normalized.reportingManagerId : null;

    if (nextRole === "Caller" && !assignedTeamLeadId) {
      throw new InvalidUserHierarchyError("Assigned Team Lead is required for Callers.");
    }
    if (nextRole === "Team Lead" && !reportingManagerId) {
      throw new InvalidUserHierarchyError("Reporting Manager is required for Team Leads.");
    }

    if (assignedTeamLeadId) {
      await assertActiveHierarchyTarget({
        repository,
        roles,
        userId: assignedTeamLeadId,
        expectedRoles: ["Team Lead"],
        label: "Assigned Team Lead",
        hierarchy,
      });
    }
    if (reportingManagerId) {
      await assertActiveHierarchyTarget({
        repository,
        roles,
        userId: reportingManagerId,
        expectedRoles: ["Manager", "Admin"],
        label: "Reporting Manager",
        hierarchy,
      });
      assertValidReportingManagerRole(
        await roles.getPrimaryRoleName(reportingManagerId),
      );
    }

    const updateData = {
      fullName: input.fullName?.trim(),
      email: nextEmail,
      phone: input.phone === undefined ? undefined : input.phone?.trim() || null,
      status: input.status,
      profilePhotoUrl:
        input.profilePhotoUrl === undefined
          ? undefined
          : input.profilePhotoUrl?.trim() || null,
      assignedTeamLeadId,
      reportingManagerId,
      updatedByUserId: actor.actorId,
    };

    const updated = roleChanged
      ? await repository.commitRoleChangeAtomically({
          userId,
          data: updateData,
          actor,
          action: statusChanged ? "Status Changed" : "User Updated",
          correlationId,
          previousRole: currentRole,
          nextRole,
          reassignCallersToTeamLeadId,
          reassignTeamLeadsToManagerId,
          reassignLeadsToUserId,
        })
      : await repository.updateWithAudit(
          userId,
          updateData,
          actor,
          statusChanged ? "Status Changed" : "User Updated",
          correlationId,
        );

    const leadName = updated.assignedTeamLeadId
      ? ((await repository.findSummaryById(updated.assignedTeamLeadId))?.fullName ?? null)
      : null;
    const managerName = updated.reportingManagerId
      ? ((await repository.findSummaryById(updated.reportingManagerId))?.fullName ?? null)
      : null;

    return toUserDto(updated, {
      roleName: nextRole,
      assignedTeamLeadName: leadName,
      reportingManagerName: managerName,
    });
  };
}
