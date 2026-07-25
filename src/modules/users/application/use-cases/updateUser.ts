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
  UserNotFoundError,
} from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
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
import { toUserDto, type UserDto } from "../dto/UserDto";

export interface UpdateUserCommand {
  userId: string;
  input: UpdateUserInput;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  correlationId?: string | null;
}

export function makeUpdateUser(repository: UserRepository, roles: RoleAssignmentPort) {
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
      // Role *changes* must follow the same rules as create (no hierarchy escalation).
      if (nextRole !== currentRole) {
        assertCanCreateRole(actorRoles, hierarchy, nextRole);
      }
    }

    if (!nextRole) {
      throw new InvalidUserHierarchyError("User must have a fixed role.");
    }

    const roleChanged = nextRole !== currentRole;
    const statusChanged = input.status !== undefined && input.status !== existing.status;

    if (actor.actorId === userId) {
      if (roleChanged) {
        throw new InvalidUserHierarchyError("You cannot change your own role.");
      }
      if (statusChanged) {
        throw new InvalidUserHierarchyError("You cannot change your own account status.");
      }
    }

    await assertKeepsActiveAdmin({
      repository,
      target: existing,
      targetRole: currentRole,
      nextStatus: input.status,
      nextRole,
    });

    if (input.email && input.email.toLowerCase() !== existing.email) {
      const clash = await repository.findByEmail(input.email.toLowerCase());
      if (clash && clash.id !== userId) throw new DuplicateUserEmailError(input.email);
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
      const lead = await repository.findById(assignedTeamLeadId);
      const leadRole = lead ? await roles.getPrimaryRoleName(assignedTeamLeadId) : null;
      if (!lead || leadRole !== "Team Lead") {
        throw new InvalidUserHierarchyError("Assigned Team Lead must be a Team Lead.");
      }
      if (
        hierarchy.visibleUserIds &&
        !hierarchy.visibleUserIds.includes(assignedTeamLeadId) &&
        hierarchy.primaryRole !== "Admin"
      ) {
        throw new InvalidUserHierarchyError(
          "Caller must be assigned to a Team Lead inside your hierarchy.",
        );
      }
    }
    if (reportingManagerId) {
      const managerRole = await roles.getPrimaryRoleName(reportingManagerId);
      assertValidReportingManagerRole(managerRole);
    }

    const updated = await repository.updateWithAudit(
      userId,
      {
        fullName: input.fullName?.trim(),
        email: input.email?.toLowerCase(),
        phone: input.phone === undefined ? undefined : input.phone?.trim() || null,
        status: input.status,
        profilePhotoUrl:
          input.profilePhotoUrl === undefined
            ? undefined
            : input.profilePhotoUrl?.trim() || null,
        assignedTeamLeadId,
        reportingManagerId,
        updatedByUserId: actor.actorId,
      },
      actor,
      statusChanged ? "Status Changed" : "User Updated",
      correlationId,
    );

    if (roleChanged && nextRole) {
      await roles.assignFixedRole(userId, nextRole, actor.actorId);
      await repository.appendAudit(
        userId,
        "Role Changed",
        actor,
        { role: currentRole },
        { role: nextRole },
        correlationId,
      );
    }

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
      permissions: await roles.getPermissionCodesForUser(userId),
    });
  };
}
