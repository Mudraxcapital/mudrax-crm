// ============================================================================
// src/modules/users/application/use-cases/createUser.ts
// ============================================================================

import type { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import {
  DuplicateUserEmailError,
  DuplicateUserPhoneError,
  InvalidUserHierarchyError,
} from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import { resolveCanManageCallerAccountsForUser } from "../services/callerManageGrant";
import type { CreateUserInput } from "../validators/userSchemas";
import { assertCanAssignRole, assertFixedRole } from "../services/userRolePolicy";
import {
  assertCanCreateRole,
  assertValidReportingManagerRole,
  normalizeHierarchyOnCreate,
} from "../services/userHierarchyPolicy";
import { toUserDto, type UserDto } from "../dto/UserDto";

export interface CreateUserCommand {
  input: CreateUserInput;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  correlationId?: string | null;
}

export function makeCreateUser(
  repository: UserRepository,
  roles: RoleAssignmentPort,
  passwordHasher: PasswordHasher,
) {
  return async function createUser(command: CreateUserCommand): Promise<UserDto> {
    const { input, actorRoles, hierarchy, actor, correlationId } = command;
    const role = assertFixedRole(input.role);
    assertCanAssignRole(actorRoles, role);
    assertCanCreateRole(actorRoles, hierarchy, role);

    const email = input.email.toLowerCase();
    const phone = input.phone.trim();
    const existingEmail = await repository.findByEmail(email);
    if (existingEmail) throw new DuplicateUserEmailError(email);

    const existingPhone = await repository.findByPhone(phone);
    if (existingPhone) throw new DuplicateUserPhoneError(phone);

    const normalized = normalizeHierarchyOnCreate({
      role,
      hierarchy,
      actorUserId: actor.actorId ?? "",
      actorRoles,
      assignedTeamLeadId: input.assignedTeamLeadId || null,
      reportingManagerId: input.reportingManagerId || null,
    });

    if (normalized.assignedTeamLeadId) {
      const lead = await repository.findById(normalized.assignedTeamLeadId);
      const leadRole = lead ? await roles.getPrimaryRoleName(lead.id) : null;
      if (!lead || lead.status !== "ACTIVE" || leadRole !== "Team Lead") {
        throw new InvalidUserHierarchyError("Assigned Team Lead must be an active Team Lead.");
      }
    }
    if (normalized.reportingManagerId) {
      const manager = await repository.findById(normalized.reportingManagerId);
      const managerRole = manager ? await roles.getPrimaryRoleName(manager.id) : null;
      if (!manager || manager.status !== "ACTIVE") {
        throw new InvalidUserHierarchyError("Reporting Manager must be an active Manager or Admin.");
      }
      assertValidReportingManagerRole(managerRole);
    }

    const passwordHash = await passwordHasher.hash(input.password);
    const created = await repository.createWithAudit(
      {
        fullName: input.fullName.trim(),
        email,
        phone,
        passwordHash,
        status: input.status,
        profilePhotoUrl: input.profilePhotoUrl?.trim() || null,
        assignedTeamLeadId: normalized.assignedTeamLeadId,
        reportingManagerId: normalized.reportingManagerId,
        createdByUserId: actor.actorId,
        mustChangePassword: false,
        canManageCallerAccounts: resolveCanManageCallerAccountsForUser({
          role,
          requested: input.canManageCallerAccounts,
          actorRoles,
          hierarchy,
        }),
      },
      actor,
      correlationId,
    );

    await roles.assignFixedRole(created.id, role, actor.actorId);

    const leadName = normalized.assignedTeamLeadId
      ? ((await repository.findSummaryById(normalized.assignedTeamLeadId))?.fullName ?? null)
      : null;
    const managerName = normalized.reportingManagerId
      ? ((await repository.findSummaryById(normalized.reportingManagerId))?.fullName ?? null)
      : null;

    return toUserDto(created, {
      roleName: role,
      assignedTeamLeadName: leadName,
      reportingManagerName: managerName,
    });
  };
}
