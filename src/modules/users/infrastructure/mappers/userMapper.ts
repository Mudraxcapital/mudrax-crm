// ============================================================================
// src/modules/users/infrastructure/mappers/userMapper.ts
// ============================================================================

import type {
  User as PrismaUser,
  UserAuditLog as PrismaUserAuditLog,
  UserSession as PrismaUserSession,
} from "@prisma/client";
import type { User, UserSessionRecord, UserSessionStatus, UserStatus } from "../../domain/entities/User";
import type {
  UserAuthProfile,
  UserScopeContext,
  UserSummary,
} from "../../domain/entities/UserAuthProfile";
import type { UserAuditRecord } from "../../domain/entities/UserAuditRecord";

export function toUser(row: PrismaUser): User {
  return {
    id: row.id,
    employeeId: row.employeeId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    status: row.status as UserStatus,
    sessionVersion: row.sessionVersion,
    mustChangePassword: row.mustChangePassword,
    lockedUntil: row.lockedUntil,
    lockedReason: row.lockedReason,
    profilePhotoUrl: row.profilePhotoUrl,
    assignedTeamLeadId: row.assignedTeamLeadId,
    reportingManagerId: row.reportingManagerId,
    canManageCallerAccounts: row.canManageCallerAccounts,
    currentTeamId: row.currentTeamId,
    currentBranchId: row.currentBranchId,
    currentDepartmentId: row.currentDepartmentId,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toUserAuthProfile(row: PrismaUser): UserAuthProfile {
  return {
    id: row.id,
    employeeId: row.employeeId,
    fullName: row.fullName,
    email: row.email,
    passwordHash: row.passwordHash,
    status: row.status as UserStatus,
    sessionVersion: row.sessionVersion,
    mustChangePassword: row.mustChangePassword,
  };
}

export function toUserScopeContext(row: PrismaUser): UserScopeContext {
  return {
    userId: row.id,
    status: row.status as UserStatus,
    currentTeamId: row.currentTeamId,
    currentBranchId: row.currentBranchId,
    currentDepartmentId: row.currentDepartmentId,
    assignedTeamLeadId: row.assignedTeamLeadId,
    reportingManagerId: row.reportingManagerId,
    canManageCallerAccounts: row.canManageCallerAccounts,
  };
}

export function toUserSummary(row: PrismaUser, companyId: string): UserSummary {
  return {
    id: row.id,
    organizationId: companyId,
    employeeId: row.employeeId,
    fullName: row.fullName,
    email: row.email,
    status: row.status as UserStatus,
    currentTeamId: row.currentTeamId,
    currentBranchId: row.currentBranchId,
  };
}

export function toUserSessionRecord(row: PrismaUserSession): UserSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    device: row.device,
    browser: row.browser,
    loginAt: row.loginAt,
    lastActivityAt: row.lastActivityAt,
    logoutAt: row.logoutAt,
    revokedAt: row.revokedAt,
    revokeReason: row.revokeReason,
    status: row.status as UserSessionStatus,
  };
}

export function toUserAuditRecord(row: PrismaUserAuditLog): UserAuditRecord {
  return {
    id: row.id,
    occurredAt: row.occurredAt,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: (row.beforeState as Record<string, unknown> | null) ?? null,
    afterState: (row.afterState as Record<string, unknown> | null) ?? null,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}
