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
import type { User, UserSessionRecord, UserStatus } from "../../domain/entities/User";
import type {
  UserAuthProfile,
  UserScopeContext,
  UserSummary,
} from "../../domain/entities/UserAuthProfile";
import type { UserAuditActor, UserAuditRecord } from "../../domain/entities/UserAuditRecord";
import { formatEmployeeId, parseEmployeeIdSequence } from "../../domain/services/employeeId";
import {
  toUser,
  toUserAuditRecord,
  toUserAuthProfile,
  toUserScopeContext,
  toUserSessionRecord,
  toUserSummary,
} from "../mappers/userMapper";

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
        lockedUntil: true,
      },
    });
    if (!row) return null;
    return {
      userId: row.id,
      status: row.status as UserStatus,
      sessionVersion: row.sessionVersion,
      mustChangePassword: row.mustChangePassword,
      lockedUntil: row.lockedUntil,
    };
  }

  async countRecentFailedLoginAttempts(email: string, sinceMinutesAgo: number): Promise<number> {
    return this.prisma.loginAttempt.count({
      where: {
        emailTried: email.toLowerCase(),
        succeeded: false,
        occurredAt: { gte: new Date(Date.now() - sinceMinutesAgo * 60_000) },
      },
    });
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

  async lockAccount(
    userId: string,
    lockedUntil: Date,
    reason: string,
    actor?: UserAuditActor | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: userId } });
      if (!before) return;
      await tx.user.update({
        where: { id: userId },
        data: { lockedUntil, lockedReason: reason },
      });
      await tx.userAuditLog.create({
        data: {
          id: randomUUID(),
          actorType: actor?.actorType ?? "SYSTEM",
          actorId: actor?.actorId ?? null,
          action: "Account Locked",
          targetType: TARGET_TYPE_USER,
          targetId: userId,
          beforeState: { lockedUntil: before.lockedUntil, lockedReason: before.lockedReason },
          afterState: { lockedUntil, lockedReason: reason },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
    });
  }

  async unlockAccount(
    userId: string,
    actor: UserAuditActor,
    ipAddress?: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: userId } });
      if (!before) return;
      await tx.user.update({
        where: { id: userId },
        data: { lockedUntil: null, lockedReason: null },
      });
      await tx.userAuditLog.create({
        data: {
          id: randomUUID(),
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "Account Unlocked",
          targetType: TARGET_TYPE_USER,
          targetId: userId,
          beforeState: { lockedUntil: before.lockedUntil, lockedReason: before.lockedReason },
          afterState: { lockedUntil: null, lockedReason: null, ipAddress: ipAddress ?? null },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
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

  async listTeamLeadIdsForManager(managerId: string): Promise<string[]> {
    // Hierarchy visibility must include every Team Lead under the Manager
    // regardless of account status (Active / Disabled / Suspended). Filtering
    // to ACTIVE-only hid disabled leads and orphaned their Callers from the tree.
    const roles = await this.prisma.role.findMany({
      where: { name: "Team Lead" },
      select: { id: true },
    });
    if (roles.length === 0) return [];

    const assignments = await this.prisma.userRole.findMany({
      where: {
        roleId: { in: roles.map((role) => role.id) },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      select: { userId: true },
    });
    const teamLeadRoleUserIds = assignments.map((row) => row.userId);
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
    const roles = await this.prisma.role.findMany({
      where: { name: "Team Lead" },
      select: { id: true },
    });
    if (roles.length === 0) return 0;
    const assignments = await this.prisma.userRole.findMany({
      where: {
        roleId: { in: roles.map((role) => role.id) },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      select: { userId: true },
    });
    const teamLeadIds = assignments.map((row) => row.userId);
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
          lockedUntil: data.lockedUntil,
          lockedReason: data.lockedReason,
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
      await tx.userAuditLog.create({
        data: {
          id: randomUUID(),
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "Deleted",
          targetType: TARGET_TYPE_USER,
          targetId: id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(toUser(before)),
          afterState: undefined,
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });
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

  async bulkDeleteWithAudit(
    ids: string[],
    actor: UserAuditActor,
    correlationId?: string | null,
  ): Promise<number> {
    let count = 0;
    for (const id of ids) {
      await this.deleteWithAudit(id, actor, correlationId);
      count += 1;
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
    const roles = await this.prisma.role.findMany({
      where: { name: roleName },
      select: { id: true },
    });
    if (roles.length === 0) return [];

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        roleId: { in: roles.map((r) => r.id) },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      select: { userId: true },
    });
    const userIds = userRoles.map((ur) => ur.userId);
    if (userIds.length === 0) return [];

    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
    });
    return rows.map((row) => toUserSummary(row, companyId));
  }
}
