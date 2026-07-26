// ============================================================================
// src/modules/users/application/use-cases/getUser.ts
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { ListUsersFilter, UserRepository } from "../../domain/repositories/UserRepository";
import { UserNotFoundError } from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import { assertCanActOnHierarchyTarget } from "../services/userHierarchyPolicy";
import {
  toUserAuditRecordDto,
  toUserDto,
  toUserListItemDto,
  toUserLoginSessionDto,
  type UserAuditRecordDto,
  type UserDto,
  type UserListItemDto,
  type UserLoginSessionDto,
} from "../dto/UserDto";

export interface GetUserAccess {
  hierarchy: HierarchyScope;
  actorRoles: string[];
  actorUserId: string;
}

export function makeGetUser(repository: UserRepository, roles: RoleAssignmentPort) {
  return async function getUser(userId: string, access?: GetUserAccess): Promise<UserDto> {
    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const roleName = await roles.getPrimaryRoleName(userId);

    if (access) {
      assertCanActOnHierarchyTarget({
        hierarchy: access.hierarchy,
        actorRoles: access.actorRoles,
        actorUserId: access.actorUserId,
        targetUserId: userId,
        targetRole: roleName,
        action: "view",
      });
    }

    const leadName = user.assignedTeamLeadId
      ? ((await repository.findSummaryById(user.assignedTeamLeadId))?.fullName ?? null)
      : null;
    const managerName = user.reportingManagerId
      ? ((await repository.findSummaryById(user.reportingManagerId))?.fullName ?? null)
      : null;

    return toUserDto(user, {
      roleName,
      assignedTeamLeadName: leadName,
      reportingManagerName: managerName,
    });
  };
}

export function makeListUsers(repository: UserRepository) {
  return async function listUsers(filter?: ListUsersFilter): Promise<UserListItemDto[]> {
    return (await repository.list(filter)).map(toUserListItemDto);
  };
}

export function makeListUserAuditLog(repository: UserRepository) {
  return async function listUserAuditLog(
    userId: string,
    limit = 50,
  ): Promise<UserAuditRecordDto[]> {
    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    const records = await repository.listAuditLog(userId, limit);
    const actorIds = [
      ...new Set(records.map((record) => record.actorId).filter((id): id is string => !!id)),
    ];
    const names = new Map<string, string>();
    await Promise.all(
      actorIds.map(async (id) => {
        const summary = await repository.findSummaryById(id);
        if (summary) names.set(id, summary.fullName);
      }),
    );
    return records.map((record) =>
      toUserAuditRecordDto(record, record.actorId ? (names.get(record.actorId) ?? null) : null),
    );
  };
}

export function makeListUserLoginSessions(repository: UserRepository) {
  return async function listUserLoginSessions(
    userId: string,
    limit = 20,
  ): Promise<UserLoginSessionDto[]> {
    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    return (await repository.listLoginSessions(userId, limit)).map(toUserLoginSessionDto);
  };
}

export function makeListUsersByRole(repository: UserRepository) {
  return async function listUsersByRole(roleName: string) {
    return repository.listByRole(roleName);
  };
}
