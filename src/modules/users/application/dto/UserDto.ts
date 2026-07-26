// ============================================================================
// src/modules/users/application/dto/UserDto.ts
// ============================================================================

import type { User, UserSessionRecord, UserStatus } from "../../domain/entities/User";
import { accountDisplayStatus } from "../../domain/entities/User";
import type { UserAuditRecord } from "../../domain/entities/UserAuditRecord";
import type { UserListItem } from "../../domain/repositories/UserRepository";
import { formatSessionDuration } from "../../domain/services/userAgent";

export interface UserDto {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  displayStatus: UserStatus;
  mustChangePassword: boolean;
  profilePhotoUrl: string | null;
  assignedTeamLeadId: string | null;
  reportingManagerId: string | null;
  currentTeamId: string | null;
  currentBranchId: string | null;
  currentDepartmentId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roleName: string | null;
  assignedTeamLeadName: string | null;
  reportingManagerName: string | null;
  /** Optional — only populated when explicitly requested (admin diagnostics). */
  permissions?: string[];
}

export interface UserListItemDto {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  displayStatus: UserStatus;
  profilePhotoUrl: string | null;
  roleName: string | null;
  assignedTeamLeadId: string | null;
  assignedTeamLeadName: string | null;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserLoginSessionDto {
  id: string;
  succeeded: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
  occurredAt: string;
}

export interface UserTrackedSessionDto {
  id: string;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  loginAt: string;
  lastActivityAt: string;
  logoutAt: string | null;
  status: string;
  duration: string;
  revokeReason: string | null;
}

export interface UserAuditRecordDto {
  id: string;
  occurredAt: string;
  actorType: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
}

export function toUserDto(
  user: User,
  extras: {
    roleName: string | null;
    assignedTeamLeadName?: string | null;
    reportingManagerName?: string | null;
    permissions?: string[];
  },
): UserDto {
  return {
    id: user.id,
    employeeId: user.employeeId,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    displayStatus: accountDisplayStatus(user.status),
    mustChangePassword: user.mustChangePassword,
    profilePhotoUrl: user.profilePhotoUrl,
    assignedTeamLeadId: user.assignedTeamLeadId,
    reportingManagerId: user.reportingManagerId,
    currentTeamId: user.currentTeamId,
    currentBranchId: user.currentBranchId,
    currentDepartmentId: user.currentDepartmentId,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    roleName: extras.roleName,
    assignedTeamLeadName: extras.assignedTeamLeadName ?? null,
    reportingManagerName: extras.reportingManagerName ?? null,
    ...(extras.permissions ? { permissions: extras.permissions } : {}),
  };
}

export function toUserListItemDto(item: UserListItem): UserListItemDto {
  return {
    id: item.id,
    employeeId: item.employeeId,
    fullName: item.fullName,
    email: item.email,
    phone: item.phone,
    status: item.status,
    displayStatus: accountDisplayStatus(item.status),
    profilePhotoUrl: item.profilePhotoUrl,
    roleName: item.roleName,
    assignedTeamLeadId: item.assignedTeamLeadId,
    assignedTeamLeadName: item.assignedTeamLeadName,
    reportingManagerId: item.reportingManagerId,
    reportingManagerName: item.reportingManagerName,
    lastLoginAt: item.lastLoginAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

export function toUserLoginSessionDto(session: {
  id: string;
  succeeded: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
  occurredAt: Date;
}): UserLoginSessionDto {
  return {
    id: session.id,
    succeeded: session.succeeded,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    failureReason: session.failureReason,
    occurredAt: session.occurredAt.toISOString(),
  };
}

export function toUserTrackedSessionDto(session: UserSessionRecord): UserTrackedSessionDto {
  const endAt = session.logoutAt ?? (session.status === "ACTIVE" ? null : session.revokedAt);
  return {
    id: session.id,
    ipAddress: session.ipAddress,
    device: session.device,
    browser: session.browser,
    loginAt: session.loginAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    logoutAt: session.logoutAt?.toISOString() ?? null,
    status: session.status,
    duration: formatSessionDuration(session.loginAt, endAt),
    revokeReason: session.revokeReason,
  };
}

export function toUserAuditRecordDto(
  record: UserAuditRecord,
  actorName: string | null = null,
): UserAuditRecordDto {
  const after = record.afterState ?? {};
  const ip =
    typeof after.ipAddress === "string" && after.ipAddress ? after.ipAddress : null;
  return {
    id: record.id,
    occurredAt: record.occurredAt.toISOString(),
    actorType: record.actorType,
    actorId: record.actorId,
    actorName,
    action: record.action,
    beforeState: record.beforeState,
    afterState: record.afterState,
    ipAddress: ip,
  };
}
