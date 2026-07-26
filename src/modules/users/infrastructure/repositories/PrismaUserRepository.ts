// ============================================================================
// src/modules/users/infrastructure/repositories/PrismaUserRepository.ts
// ============================================================================

import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getCompanyId } from "@/infra/company/getCompanyId";
import type {
  CreateUserData,
  CreateUserSessionData,
  ListUsersFilter,
  RecordLoginAttemptInput,
  UpdateUserData,
  UserListItem,
  UserRepository,
} from "../../domain/repositories/UserRepository";
import type {
  FixedUserRole,
  User,
  UserSessionRecord,
  UserStatus,
} from "../../domain/entities/User";
import type {
  UserAuthProfile,
  UserScopeContext,
  UserSummary,
} from "../../domain/entities/UserAuthProfile";
import type { UserAuditActor, UserAuditRecord } from "../../domain/entities/UserAuditRecord";
import {
  LastActiveAdminError,
  UserDeleteBlockedError,
} from "../../domain/errors/UserErrors";
import { formatEmployeeId, parseEmployeeIdSequence } from "../../domain/services/employeeId";
import {
  toUser,
  toUserAuditRecord,
  toUserAuthProfile,
  toUserScopeContext,
  toUserSessionRecord,
  toUserSummary,
} from "../mappers/userMapper";
import { reassignLeadsInTx } from "../adapters/reassignLeadsInTx";

const TARGET_TYPE_USER = "User";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(user: User): Prisma.InputJsonValue {
  return {
    id: user.id,
    employeeId: user.employeeId,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    profilePhotoUrl: user.profilePhotoUrl,
    mustChangePassword: user.mustChangePassword,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    lockedReason: user.lockedReason,
    assignedTeamLeadId: user.assignedTeamLeadId,
    reportingManagerId: user.reportingManagerId,
  };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAuthProfileByEmail(email: string): Promise<UserAuthProfile | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? toUserAuthProfile(row) : null;
  }

  async findScopeContext(userId: string): Promise<UserScopeContext | null> {
    const row = await this.prisma.user.findUnique({ where: { id: userId } });
    return row ? toUserScopeContext(row) : null;
  }

  async findAccountSessionState(userId: string) {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        sessionVersion: true,
        mustChangePassword: true,
      },
    });
    if (!row) return null;
    return {
      userId: row.id,
      status: row.status as UserStatus,
      sessionVersion: row.sessionVersion,
      mustChangePassword: row.mustChangePassword,
    };
  }

  async recordLoginAttempt(input: RecordLoginAttemptInput): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        userId: input.userId,
        emailTried: input.emailTried.toLowerCase(),
        succeeded: input.succeeded,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: input.failureReason,
      },
    });
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async findSummaryById(id: string): Promise<UserSummary | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return toUserSummary(row, await getCompanyId());
  }

  async listSummaries(): Promise<UserSummary[]> {
    const companyId = await getCompanyId();
    const rows = await this.prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
    });
    return rows.map((row) => toUserSummary(row, companyId));
  }

  async listCallerIdsForTeamLeads(teamLeadIds: string[]): Promise<string[]> {
    if (teamLeadIds.length === 0) return [];
    // Include Disabled / Suspended Callers so managers can still see and re-enable them.
    const rows = await this.prisma.user.findMany({
      where: { assignedTeamLeadId: { in: teamLeadIds } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /** User ids currently holding a fixed role (effective assignment). */
  private async userIdsWithRole(roleName: string): Promise<string[]> {
    return this.userIdsWithRoleInTx(this.prisma, roleName);
  }

  private async userIdsWithRoleInTx(
    db: Prisma.TransactionClient | PrismaClient,
    roleName: string,
  ): Promise<string[]> {
    const roles = await db.role.findMany({
      where: { name: roleName },
      select: { id: true },
    });
    if (roles.length === 0) return [];
    const assignments = await db.userRole.findMany({
      where: {
        roleId: { in: roles.map((role) => role.id) },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      select: { userId: true },
    });
    return assignments.map((row) => row.userId);
  }

  private async appendAuditInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    action: string,
    actor: UserAuditActor,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null,
    correlationId?: string | null,
  ): Promise<void> {
    await tx.userAuditLog.create({
      data: {
        id: randomUUID(),
        actorType: actor.actorType,
        actorId: actor.actorId,
        action,
        targetType: TARGET_TYPE_USER,
        targetId: userId,
        correlationId: correlationId ?? null,
        beforeState: beforeState ? (beforeState as Prisma.InputJsonValue) : undefined,
        afterState: afterState ? (afterState as Prisma.InputJsonValue) : undefined,
        recordHash: PLACEHOLDER_RECORD_HASH,
      },
    });
  }

  private async replaceFixedRoleInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    roleName: FixedUserRole,
    assignedByUserId: string | null,
  ): Promise<void> {
    const companyId = await getCompanyId();
    const role = await tx.role.findUnique({
      where: { organizationId_name: { organizationId: companyId, name: roleName } },
    });
    if (!role) {
      throw new Error(`Fixed role not found: ${roleName}`);
    }
    const now = new Date();
    await tx.userRole.deleteMany({ where: { userId } });
    await tx.userRole.create({
      data: {
        userId,
        roleId: role.id,
        effectiveFrom: now,
        assignedByUserId,
      },
    });
  }

  /**
   * Hierarchy + lead reassignments inside an open transaction.
   * Throws UserDeleteBlockedError when counts require a missing target.
   */
  private async applyReassignmentsInTx(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      actor: UserAuditActor;
      correlationId?: string | null;
      currentRole: FixedUserRole | null;
      reassignCallersToTeamLeadId?: string | null;
      reassignTeamLeadsToManagerId?: string | null;
      reassignLeadsToUserId?: string | null;
      leadReason: "UserDeletedOrDemoted" | "UserRoleChanged";
    },
  ): Promise<void> {
    const {
      userId,
      actor,
      correlationId,
      currentRole,
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
      leadReason,
    } = input;

    if (currentRole === "Manager") {
      const teamLeadIds = await this.userIdsWithRoleInTx(tx, "Team Lead");
      const teamLeadCount =
        teamLeadIds.length === 0
          ? 0
          : await tx.user.count({
              where: { reportingManagerId: userId, id: { in: teamLeadIds } },
            });
      if (teamLeadCount > 0) {
        if (!reassignTeamLeadsToManagerId || reassignTeamLeadsToManagerId === userId) {
          throw new UserDeleteBlockedError(
            `This Manager has ${teamLeadCount} Team Lead(s). Reassign them before continuing.`,
          );
        }
        await tx.user.updateMany({
          where: { reportingManagerId: userId, id: { in: teamLeadIds } },
          data: { reportingManagerId: reassignTeamLeadsToManagerId },
        });
        await this.appendAuditInTx(
          tx,
          userId,
          "Team Leads Reassigned",
          actor,
          { teamLeadCount },
          { reassignTeamLeadsToManagerId, teamLeadCount },
          correlationId,
        );
      }
    }

    if (currentRole === "Team Lead") {
      const callerCount = await tx.user.count({ where: { assignedTeamLeadId: userId } });
      if (callerCount > 0) {
        if (!reassignCallersToTeamLeadId || reassignCallersToTeamLeadId === userId) {
          throw new UserDeleteBlockedError(
            `This Team Lead has ${callerCount} Caller(s). Reassign them before continuing.`,
          );
        }
        await tx.user.updateMany({
          where: { assignedTeamLeadId: userId },
          data: { assignedTeamLeadId: reassignCallersToTeamLeadId },
        });
        await this.appendAuditInTx(
          tx,
          userId,
          "Callers Reassigned",
          actor,
          { callerCount },
          { reassignCallersToTeamLeadId, callerCount },
          correlationId,
        );
      }
    }

    const leadCount = await tx.lead.count({ where: { currentAssigneeUserId: userId } });
    if (leadCount > 0) {
      if (!reassignLeadsToUserId || reassignLeadsToUserId === userId) {
        throw new UserDeleteBlockedError(
          `This employee has ${leadCount} assigned Lead(s). Reassign those Leads before continuing.`,
        );
      }
      const moved = await reassignLeadsInTx(
        tx,
        userId,
        reassignLeadsToUserId,
        actor.actorId,
        leadReason,
      );
      await this.appendAuditInTx(
        tx,
        userId,
        "Leads Reassigned",
        actor,
        { leadCount },
        { reassignLeadsToUserId, leadCount: moved },
        correlationId,
      );
    }
  }

  async listTeamLeadIdsForManager(managerId: string): Promise<string[]> {
    // Hierarchy visibility must include every Team Lead under the Manager
    // regardless of account status (Active / Disabled / Suspended). Filtering
    // to ACTIVE-only hid disabled leads and orphaned their Callers from the tree.
    const teamLeadRoleUserIds = await this.userIdsWithRole("Team Lead");
    if (teamLeadRoleUserIds.length === 0) return [];

    const rows = await this.prisma.user.findMany({
      where: {
        reportingManagerId: managerId,
        id: { in: teamLeadRoleUserIds },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? toUser(row) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const normalized = phone.trim();
    if (!normalized) return null;
    const row = await this.prisma.user.findFirst({ where: { phone: normalized } });
    return row ? toUser(row) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { employeeId } });
    return row ? toUser(row) : null;
  }

  async countCallersForTeamLead(teamLeadId: string): Promise<number> {
    return this.prisma.user.count({ where: { assignedTeamLeadId: teamLeadId } });
  }

  async countTeamLeadsForManager(managerId: string): Promise<number> {
    const teamLeadIds = await this.userIdsWithRole("Team Lead");
    if (teamLeadIds.length === 0) return 0;
    return this.prisma.user.count({
      where: { reportingManagerId: managerId, id: { in: teamLeadIds } },
    });
  }

  async countApiKeysForUser(userId: string): Promise<number> {
    return this.prisma.apiKey.count({
      where: { ownerUserId: userId, revokedAt: null },
    });
  }

  async reassignCallersToTeamLead(
    fromTeamLeadId: string,
    toTeamLeadId: string,
  ): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: { assignedTeamLeadId: fromTeamLeadId },
      data: { assignedTeamLeadId: toTeamLeadId },
    });
    return result.count;
  }

  async reassignTeamLeadsToManager(
    fromManagerId: string,
    toManagerId: string,
  ): Promise<number> {
    if (fromManagerId === toManagerId) return 0;
    const teamLeadIds = await this.userIdsWithRole("Team Lead");
    if (teamLeadIds.length === 0) return 0;
    const result = await this.prisma.user.updateMany({
      where: { reportingManagerId: fromManagerId, id: { in: teamLeadIds } },
      data: { reportingManagerId: toManagerId },
    });
    return result.count;
  }

  async assertKeepsActiveAdminLocked(targetUserId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const adminRoles = await tx.role.findMany({
          where: { name: "Admin" },
          select: { id: true },
        });
        if (adminRoles.length === 0) return;

        const assignments = await tx.userRole.findMany({
          where: {
            roleId: { in: adminRoles.map((role) => role.id) },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
          },
          select: { userId: true },
        });
        const adminIds = assignments.map((row) => row.userId);
        if (adminIds.length === 0) return;

        // Row-lock every Admin account so concurrent demote/disable/delete serializes.
        await tx.$queryRawUnsafe(
          `SELECT id FROM "users"."users" WHERE id = ANY($1::uuid[]) FOR UPDATE`,
          adminIds,
        );

        const activeAdmins = await tx.user.findMany({
          where: { id: { in: adminIds }, status: "ACTIVE" },
          select: { id: true },
        });
        const targetIsActiveAdmin = activeAdmins.some((row) => row.id === targetUserId);
        if (targetIsActiveAdmin && activeAdmins.length <= 1) {
          throw new LastActiveAdminError();
        }
      },
      { isolationLevel: "Serializable" },
    );
  }

  private buildWhere(filter?: ListUsersFilter): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.teamLeadId) where.assignedTeamLeadId = filter.teamLeadId;
    if (filter?.reportingManagerId) where.reportingManagerId = filter.reportingManagerId;
    if (filter?.userIds) where.id = { in: filter.userIds };
    if (filter?.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }
    return where;
  }

  async list(filter?: ListUsersFilter): Promise<UserListItem[]> {
    const rows = await this.prisma.user.findMany({
      where: this.buildWhere(filter),
      orderBy: { fullName: "asc" },
      take: filter?.limit ?? 500,
      skip: filter?.offset ?? 0,
    });

    const userIds = rows.map((row) => row.id);
    const leadIds = [
      ...new Set(rows.map((row) => row.assignedTeamLeadId).filter((id): id is string => !!id)),
    ];
    const managerIds = [
      ...new Set(rows.map((row) => row.reportingManagerId).filter((id): id is string => !!id)),
    ];
    const relatedIds = [...new Set([...leadIds, ...managerIds])];

    const [userRoles, relatedUsers] = await Promise.all([
      this.prisma.userRole.findMany({
        where: {
          userId: { in: userIds },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
        },
        include: { role: true },
      }),
      relatedIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: relatedIds } },
            select: { id: true, fullName: true },
          })
        : Promise.resolve([]),
    ]);

    const roleByUser = new Map<string, string>();
    for (const ur of userRoles) {
      if (!roleByUser.has(ur.userId)) roleByUser.set(ur.userId, ur.role.name);
    }
    const nameById = new Map(relatedUsers.map((user) => [user.id, user.fullName]));

    let items: UserListItem[] = rows.map((row) => ({
      ...toUser(row),
      roleName: roleByUser.get(row.id) ?? null,
      assignedTeamLeadName: row.assignedTeamLeadId
        ? (nameById.get(row.assignedTeamLeadId) ?? null)
        : null,
      reportingManagerName: row.reportingManagerId
        ? (nameById.get(row.reportingManagerId) ?? null)
        : null,
    }));

    if (filter?.role) {
      items = items.filter((item) => item.roleName === filter.role);
    }

    return items;
  }

  async count(filter?: ListUsersFilter): Promise<number> {
    if (filter?.role) {
      return (await this.list(filter)).length;
    }
    return this.prisma.user.count({ where: this.buildWhere(filter) });
  }

  async createWithAudit(
    data: CreateUserData,
    actor: UserAuditActor,
    correlationId?: string | null,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize MCS id allocation across concurrent creates.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('users.employee_id'))`;

      const existing = await tx.user.findMany({
        where: { employeeId: { startsWith: "MCS" } },
        select: { employeeId: true },
      });
      let maxSeq = 0;
      for (const row of existing) {
        const seq = parseEmployeeIdSequence(row.employeeId);
        if (seq != null && seq > maxSeq) maxSeq = seq;
      }
      const employeeId = formatEmployeeId(maxSeq + 1);

      const row = await tx.user.create({
        data: {
          employeeId,
          fullName: data.fullName,
          email: data.email.toLowerCase(),
          phone: data.phone,
          passwordHash: data.passwordHash,
          status: data.status,
          profilePhotoUrl: data.profilePhotoUrl,
          mustChangePassword: data.mustChangePassword ?? true,
          assignedTeamLeadId: data.assignedTeamLeadId,
          reportingManagerId: data.reportingManagerId,
          createdByUserId: data.createdByUserId,
          updatedByUserId: data.createdByUserId,
        },
      });
      const user = toUser(row);
      await tx.userAuditLog.create({
        data: {
          id: randomUUID(),
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "User Created",
          targetType: TARGET_TYPE_USER,
          targetId: user.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(user),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return user;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateUserData,
    actor: UserAuditActor,
    action: string,
    correlationId?: string | null,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id } });
      if (!before) throw new Error(`User not found: ${id}`);

      const statusChanging =
        data.status !== undefined && data.status !== before.status;
      const row = await tx.user.update({
        where: { id },
        data: {
          fullName: data.fullName,
          email: data.email?.toLowerCase(),
          phone: data.phone,
          status: data.status,
          profilePhotoUrl: data.profilePhotoUrl,
          mustChangePassword: data.mustChangePassword,
          assignedTeamLeadId: data.assignedTeamLeadId,
          reportingManagerId: data.reportingManagerId,
          updatedByUserId: data.updatedByUserId,
          // Any status change invalidates every existing JWT / remember-me session.
          ...(statusChanging ? { sessionVersion: { increment: 1 } } : {}),
        },
      });
      if (statusChanging) {
        await tx.userSession.updateMany({
          where: { userId: id, status: "ACTIVE" },
          data: {
            status: "REVOKED",
            revokedAt: new Date(),
            logoutAt: new Date(),
            revokeReason: "ACCOUNT_STATUS_CHANGED",
          },
        });
      }
      const user = toUser(row);
      await tx.userAuditLog.create({
        data: {
          id: randomUUID(),
          actorType: actor.actorType,
          actorId: actor.actorId,
          action,
          targetType: TARGET_TYPE_USER,
          targetId: id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(toUser(before)),
          afterState: toAuditJson(user),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
      return user;
    });
  }

  async setPasswordHashWithAudit(
    id: string,
    passwordHash: string,
    actor: UserAuditActor,
    correlationId?: string | null,
    options?: {
      mustChangePassword?: boolean;
      clearMustChangePassword?: boolean;
      action?: string;
      ipAddress?: string | null;
    },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id } });
      if (!before) throw new Error(`User not found: ${id}`);
      const mustChangePassword = options?.clearMustChangePassword
        ? false
        : (options?.mustChangePassword ?? true);
      const actionName =
        options?.action ??
        (options?.clearMustChangePassword ? "Password Changed (Self)" : "Password Reset (Admin)");
      await tx.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword,
          updatedByUserId: actor.actorId,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.userSession.updateMany({
        where: { userId: id, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          logoutAt: new Date(),
          revokeReason: "PASSWORD_CHANGED",
        },
      });
      await tx.userAuditLog.create({
        data: {
          id: randomUUID(),
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: actionName,
          targetType: TARGET_TYPE_USER,
          targetId: id,
          correlationId: correlationId ?? null,
          beforeState: {
            mustChangePassword: before.mustChangePassword,
            sessionVersion: before.sessionVersion,
          },
          afterState: {
            mustChangePassword,
            sessionsInvalidated: true,
            forcePasswordChange: mustChangePassword,
            ipAddress: options?.ipAddress ?? null,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
    });
  }

  async deleteWithAudit(
    id: string,
    actor: UserAuditActor,
    correlationId?: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id } });
      if (!before) return;

      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.apiKey.deleteMany({ where: { ownerUserId: id } });
      await tx.loginAttempt.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
      await this.appendAuditInTx(
        tx,
        id,
        "Deleted",
        actor,
        toAuditJson(toUser(before)) as Record<string, unknown>,
        null,
        correlationId,
      );
    });
  }

  async deleteAtomically(input: {
    userId: string;
    actor: UserAuditActor;
    correlationId?: string | null;
    targetRole: FixedUserRole | null;
    reassignCallersToTeamLeadId?: string | null;
    reassignTeamLeadsToManagerId?: string | null;
    reassignLeadsToUserId?: string | null;
  }): Promise<void> {
    const {
      userId,
      actor,
      correlationId,
      targetRole,
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
    } = input;

    await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: userId } });
      if (!before) return;

      await this.applyReassignmentsInTx(tx, {
        userId,
        actor,
        correlationId,
        currentRole: targetRole,
        reassignCallersToTeamLeadId,
        reassignTeamLeadsToManagerId,
        reassignLeadsToUserId,
        leadReason: "UserDeletedOrDemoted",
      });

      await tx.userRole.deleteMany({ where: { userId } });
      await tx.apiKey.deleteMany({ where: { ownerUserId: userId } });
      await tx.loginAttempt.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      await this.appendAuditInTx(
        tx,
        userId,
        "Deleted",
        actor,
        toAuditJson(toUser(before)) as Record<string, unknown>,
        null,
        correlationId,
      );
    });
  }

  async commitRoleChangeAtomically(input: {
    userId: string;
    data: UpdateUserData;
    actor: UserAuditActor;
    action: string;
    correlationId?: string | null;
    previousRole: FixedUserRole | null;
    nextRole: FixedUserRole;
    reassignCallersToTeamLeadId?: string | null;
    reassignTeamLeadsToManagerId?: string | null;
    reassignLeadsToUserId?: string | null;
  }): Promise<User> {
    const {
      userId,
      data,
      actor,
      action,
      correlationId,
      previousRole,
      nextRole,
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
    } = input;

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: userId } });
      if (!before) throw new Error(`User not found: ${userId}`);

      await this.applyReassignmentsInTx(tx, {
        userId,
        actor,
        correlationId,
        currentRole: previousRole,
        reassignCallersToTeamLeadId,
        reassignTeamLeadsToManagerId,
        reassignLeadsToUserId,
        leadReason: "UserRoleChanged",
      });

      const statusChanging = data.status !== undefined && data.status !== before.status;
      const row = await tx.user.update({
        where: { id: userId },
        data: {
          fullName: data.fullName,
          email: data.email?.toLowerCase(),
          phone: data.phone,
          status: data.status,
          profilePhotoUrl: data.profilePhotoUrl,
          mustChangePassword: data.mustChangePassword,
          assignedTeamLeadId: data.assignedTeamLeadId,
          reportingManagerId: data.reportingManagerId,
          updatedByUserId: data.updatedByUserId,
          ...(statusChanging ? { sessionVersion: { increment: 1 } } : {}),
        },
      });
      if (statusChanging) {
        await tx.userSession.updateMany({
          where: { userId, status: "ACTIVE" },
          data: {
            status: "REVOKED",
            revokedAt: new Date(),
            logoutAt: new Date(),
            revokeReason: "ACCOUNT_STATUS_CHANGED",
          },
        });
      }

      const user = toUser(row);
      await this.appendAuditInTx(
        tx,
        userId,
        action,
        actor,
        toAuditJson(toUser(before)) as Record<string, unknown>,
        toAuditJson(user) as Record<string, unknown>,
        correlationId,
      );

      if (previousRole !== nextRole) {
        await this.replaceFixedRoleInTx(tx, userId, nextRole, actor.actorId);
        await this.appendAuditInTx(
          tx,
          userId,
          "Role Changed",
          actor,
          { role: previousRole },
          { role: nextRole },
          correlationId,
        );
      }

      return user;
    });
  }

  async bulkSetStatusWithAudit(
    ids: string[],
    status: UserStatus,
    actor: UserAuditActor,
    correlationId?: string | null,
    meta?: {
      reason?: string | null;
      ipAddress?: string | null;
      forceLogout?: boolean;
      action?: string;
    },
  ): Promise<number> {
    const actionName =
      meta?.action ??
      (status === "ACTIVE"
        ? "Account Enabled"
        : status === "SUSPENDED"
          ? "Account Suspended"
          : "Account Disabled");
    let count = 0;
    for (const id of ids) {
      await this.prisma.$transaction(async (tx) => {
        const before = await tx.user.findUnique({ where: { id } });
        if (!before) return;
        if (before.status === status) return;

        const row = await tx.user.update({
          where: { id },
          data: {
            status,
            updatedByUserId: actor.actorId,
            sessionVersion: { increment: 1 },
          },
        });
        await tx.userSession.updateMany({
          where: { userId: id, status: "ACTIVE" },
          data: {
            status: "REVOKED",
            revokedAt: new Date(),
            logoutAt: new Date(),
            revokeReason: "ACCOUNT_STATUS_CHANGED",
          },
        });
        const user = toUser(row);
        await tx.userAuditLog.create({
          data: {
            id: randomUUID(),
            actorType: actor.actorType,
            actorId: actor.actorId,
            action: actionName,
            targetType: TARGET_TYPE_USER,
            targetId: id,
            correlationId: correlationId ?? null,
            beforeState: {
              status: before.status,
              sessionVersion: before.sessionVersion,
            },
            afterState: {
              status: user.status,
              sessionVersion: user.sessionVersion,
              reason: meta?.reason ?? null,
              ipAddress: meta?.ipAddress ?? null,
              forceLogout: meta?.forceLogout ?? true,
              sessionsInvalidated: true,
            },
            recordHash: PLACEHOLDER_RECORD_HASH,
          },
        });
        count += 1;
      });
    }
    return count;
  }

  async listAuditLog(userId: string, limit = 50): Promise<UserAuditRecord[]> {
    const rows = await this.prisma.userAuditLog.findMany({
      where: { targetType: TARGET_TYPE_USER, targetId: userId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map(toUserAuditRecord);
  }

  async listLoginSessions(userId: string, limit = 20) {
    const rows = await this.prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      succeeded: row.succeeded,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      failureReason: row.failureReason,
      occurredAt: row.occurredAt,
    }));
  }

  async createSession(data: CreateUserSessionData): Promise<UserSessionRecord> {
    const row = await this.prisma.userSession.create({
      data: {
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        device: data.device,
        browser: data.browser,
        status: "ACTIVE",
      },
    });
    return toUserSessionRecord(row);
  }

  async findSessionById(sessionId: string): Promise<UserSessionRecord | null> {
    const row = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    return row ? toUserSessionRecord(row) : null;
  }

  async listActiveSessions(userId: string): Promise<UserSessionRecord[]> {
    const rows = await this.prisma.userSession.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { lastActivityAt: "desc" },
    });
    return rows.map(toUserSessionRecord);
  }

  async listSessionHistory(userId: string, limit = 30): Promise<UserSessionRecord[]> {
    const rows = await this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { loginAt: "desc" },
      take: limit,
    });
    return rows.map(toUserSessionRecord);
  }

  async touchSessionActivity(sessionId: string): Promise<void> {
    const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== "ACTIVE") return;
    const staleMs = Date.now() - session.lastActivityAt.getTime();
    if (staleMs < 60_000) return;
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  async endSession(sessionId: string, reason?: string | null): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, status: "ACTIVE" },
      data: {
        status: "ENDED",
        logoutAt: new Date(),
        revokeReason: reason ?? "LOGOUT",
      },
    });
  }

  async revokeSession(sessionId: string, reason?: string | null): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, status: "ACTIVE" },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        logoutAt: new Date(),
        revokeReason: reason ?? "REVOKED_BY_ADMIN",
      },
    });
  }

  async revokeAllSessionsForUser(userId: string, reason?: string | null): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: { userId, status: "ACTIVE" },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        logoutAt: new Date(),
        revokeReason: reason ?? "REVOKE_ALL",
      },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
    return result.count;
  }

  async appendAudit(
    userId: string,
    action: string,
    actor: UserAuditActor,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null,
    correlationId?: string | null,
  ): Promise<void> {
    await this.prisma.userAuditLog.create({
      data: {
        id: randomUUID(),
        actorType: actor.actorType,
        actorId: actor.actorId,
        action,
        targetType: TARGET_TYPE_USER,
        targetId: userId,
        correlationId: correlationId ?? null,
        beforeState: beforeState ? (beforeState as Prisma.InputJsonValue) : undefined,
        afterState: afterState ? (afterState as Prisma.InputJsonValue) : undefined,
        recordHash: PLACEHOLDER_RECORD_HASH,
      },
    });
  }

  async listByRole(roleName: string): Promise<UserSummary[]> {
    const companyId = await getCompanyId();
    const userIds = await this.userIdsWithRole(roleName);
    if (userIds.length === 0) return [];

    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
    });
    return rows.map((row) => toUserSummary(row, companyId));
  }
}
