// ============================================================================
// Active session revoke / list for User Management.
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import { UserNotFoundError } from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import { assertCanActOnHierarchyTarget } from "../services/userHierarchyPolicy";
import { toUserTrackedSessionDto, type UserTrackedSessionDto } from "../dto/UserDto";

export function makeListActiveUserSessions(repository: UserRepository) {
  return async function listActiveUserSessions(userId: string): Promise<UserTrackedSessionDto[]> {
    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    return (await repository.listActiveSessions(userId)).map(toUserTrackedSessionDto);
  };
}

export function makeListUserSessionHistory(repository: UserRepository) {
  return async function listUserSessionHistory(
    userId: string,
    limit = 30,
  ): Promise<UserTrackedSessionDto[]> {
    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    return (await repository.listSessionHistory(userId, limit)).map(toUserTrackedSessionDto);
  };
}

export function makeRevokeUserSession(repository: UserRepository, roles: RoleAssignmentPort) {
  return async function revokeUserSession(input: {
    userId: string;
    sessionId: string;
    actorRoles: string[];
    hierarchy: HierarchyScope;
    actor: UserAuditActor;
    ipAddress?: string | null;
  }): Promise<void> {
    const user = await repository.findById(input.userId);
    if (!user) throw new UserNotFoundError(input.userId);
    const targetRole = await roles.getPrimaryRoleName(input.userId);
    assertCanActOnHierarchyTarget({
      hierarchy: input.hierarchy,
      actorRoles: input.actorRoles,
      actorUserId: input.actor.actorId ?? "",
      targetUserId: input.userId,
      targetRole,
      action: "edit",
    });

    const session = await repository.findSessionById(input.sessionId);
    if (!session || session.userId !== input.userId) {
      throw new UserNotFoundError(input.sessionId);
    }

    // Mark only this tracked session revoked — other devices keep working.
    // getCurrentUser rejects JWTs whose sessionId is no longer ACTIVE.
    await repository.revokeSession(input.sessionId, "REVOKED_BY_ADMIN");
    await repository.appendAudit(
      input.userId,
      "Session Revoked",
      input.actor,
      { sessionId: input.sessionId, status: session.status },
      {
        sessionId: input.sessionId,
        status: "REVOKED",
        ipAddress: input.ipAddress ?? null,
      },
    );
  };
}

export function makeRevokeAllUserSessions(repository: UserRepository, roles: RoleAssignmentPort) {
  return async function revokeAllUserSessions(input: {
    userId: string;
    actorRoles: string[];
    hierarchy: HierarchyScope;
    actor: UserAuditActor;
    ipAddress?: string | null;
  }): Promise<number> {
    const user = await repository.findById(input.userId);
    if (!user) throw new UserNotFoundError(input.userId);
    const targetRole = await roles.getPrimaryRoleName(input.userId);
    assertCanActOnHierarchyTarget({
      hierarchy: input.hierarchy,
      actorRoles: input.actorRoles,
      actorUserId: input.actor.actorId ?? "",
      targetUserId: input.userId,
      targetRole,
      action: "edit",
    });

    const count = await repository.revokeAllSessionsForUser(input.userId, "REVOKE_ALL");
    await repository.appendAudit(
      input.userId,
      "All Sessions Revoked",
      input.actor,
      null,
      { count, ipAddress: input.ipAddress ?? null },
    );
    return count;
  };
}
