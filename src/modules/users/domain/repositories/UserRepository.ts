// ============================================================================
// src/modules/users/domain/repositories/UserRepository.ts
// ============================================================================

import type { FixedUserRole, User, UserSessionRecord, UserStatus } from "../entities/User";
import type { UserAuthProfile, UserScopeContext, UserSummary } from "../entities/UserAuthProfile";
import type { UserAuditActor, UserAuditRecord } from "../entities/UserAuditRecord";

export interface RecordLoginAttemptInput {
  userId: string | null;
  emailTried: string;
  succeeded: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
}

export interface ListUsersFilter {
  search?: string;
  role?: string;
  status?: UserStatus;
  teamLeadId?: string;
  /** Restrict to Team Leads reporting to this Manager. */
  reportingManagerId?: string;
  /** Explicit allow-list of user ids (hierarchy visibility). */
  userIds?: string[];
  limit?: number;
  offset?: number;
}

export interface CreateUserData {
  fullName: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  status: UserStatus;
  profilePhotoUrl: string | null;
  assignedTeamLeadId: string | null;
  reportingManagerId: string | null;
  createdByUserId: string | null;
  mustChangePassword?: boolean;
  canManageCallerAccounts?: boolean;
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  phone?: string | null;
  status?: UserStatus;
  profilePhotoUrl?: string | null;
  assignedTeamLeadId?: string | null;
  reportingManagerId?: string | null;
  updatedByUserId?: string | null;
  mustChangePassword?: boolean;
  canManageCallerAccounts?: boolean;
}

export interface UserListItem extends User {
  roleName: string | null;
  assignedTeamLeadName: string | null;
  reportingManagerName: string | null;
}

export interface UserLoginSession {
  id: string;
  succeeded: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
  occurredAt: Date;
}

export interface CreateUserSessionData {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
}

export interface UserRepository {
  findAuthProfileByEmail(email: string): Promise<UserAuthProfile | null>;
  findScopeContext(userId: string): Promise<UserScopeContext | null>;
  /** Status + sessionVersion for centralized session validity checks. */
  findAccountSessionState(
    userId: string,
  ): Promise<import("../entities/UserAuthProfile").AccountSessionState | null>;
  recordLoginAttempt(input: RecordLoginAttemptInput): Promise<void>;
  touchLastLogin(userId: string): Promise<void>;

  findSummaryById(id: string): Promise<UserSummary | null>;
  /** All active employees (single-company). */
  listSummaries(): Promise<UserSummary[]>;
  /** Active Callers whose assignedTeamLeadId is in the given set. */
  listCallerIdsForTeamLeads(teamLeadIds: string[]): Promise<string[]>;
  /** Active Team Leads whose reportingManagerId matches. */
  listTeamLeadIdsForManager(managerId: string): Promise<string[]>;

  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByEmployeeId(employeeId: string): Promise<User | null>;

  /** Callers currently assigned to this Team Lead (any status). */
  countCallersForTeamLead(teamLeadId: string): Promise<number>;
  /** Team Leads reporting to this Manager (any status). */
  countTeamLeadsForManager(managerId: string): Promise<number>;
  /** Campaigns owned by this Manager (`campaigns.ownerManagerId`). */
  countCampaignsForManager(managerId: string): Promise<number>;
  countApiKeysForUser(userId: string): Promise<number>;
  reassignCallersToTeamLead(fromTeamLeadId: string, toTeamLeadId: string): Promise<number>;
  /** Move Team Leads reporting to fromManagerId onto toManagerId. */
  reassignTeamLeadsToManager(fromManagerId: string, toManagerId: string): Promise<number>;
  /**
   * Locks active Admin rows (FOR UPDATE) and throws LastActiveAdminError when
   * mutating targetUserId would leave zero ACTIVE Admins. Safe under concurrency.
   */
  assertKeepsActiveAdminLocked(targetUserId: string): Promise<void>;

  list(filter?: ListUsersFilter): Promise<UserListItem[]>;
  count(filter?: ListUsersFilter): Promise<number>;

  createWithAudit(
    data: CreateUserData,
    actor: UserAuditActor,
    correlationId?: string | null,
  ): Promise<User>;

  updateWithAudit(
    id: string,
    data: UpdateUserData,
    actor: UserAuditActor,
    action: string,
    correlationId?: string | null,
  ): Promise<User>;

  setPasswordHashWithAudit(
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
  ): Promise<void>;

  deleteWithAudit(
    id: string,
    actor: UserAuditActor,
    correlationId?: string | null,
  ): Promise<void>;

  /**
   * Hierarchy reassignment + lead reassignment + user delete + audits
   * in a single database transaction (all-or-nothing).
   */
  deleteAtomically(input: {
    userId: string;
    actor: UserAuditActor;
    correlationId?: string | null;
    targetRole: FixedUserRole | null;
    reassignCallersToTeamLeadId?: string | null;
    reassignTeamLeadsToManagerId?: string | null;
    reassignLeadsToUserId?: string | null;
  }): Promise<void>;

  /**
   * Delete many users in one database transaction (all-or-nothing).
   */
  bulkDeleteAtomically(input: {
    deletes: Array<{ userId: string; targetRole: FixedUserRole | null }>;
    actor: UserAuditActor;
    correlationId?: string | null;
    reassignCallersToTeamLeadId?: string | null;
    reassignTeamLeadsToManagerId?: string | null;
    reassignLeadsToUserId?: string | null;
  }): Promise<void>;

  /**
   * Hierarchy / lead reassignment + profile update + optional role replace
   * in a single database transaction (all-or-nothing).
   */
  commitRoleChangeAtomically(input: {
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
  }): Promise<User>;

  bulkSetStatusWithAudit(
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
  ): Promise<number>;

  listAuditLog(userId: string, limit?: number): Promise<UserAuditRecord[]>;
  /** Failed / succeeded login attempts (audit trail of sign-in tries). */
  listLoginSessions(userId: string, limit?: number): Promise<UserLoginSession[]>;

  createSession(data: CreateUserSessionData): Promise<UserSessionRecord>;
  findSessionById(sessionId: string): Promise<UserSessionRecord | null>;
  listActiveSessions(userId: string): Promise<UserSessionRecord[]>;
  listSessionHistory(userId: string, limit?: number): Promise<UserSessionRecord[]>;
  touchSessionActivity(sessionId: string): Promise<void>;
  endSession(sessionId: string, reason?: string | null): Promise<void>;
  revokeSession(sessionId: string, reason?: string | null): Promise<void>;
  revokeAllSessionsForUser(userId: string, reason?: string | null): Promise<number>;

  appendAudit(
    userId: string,
    action: string,
    actor: UserAuditActor,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null,
    correlationId?: string | null,
  ): Promise<void>;

  listByRole(roleName: string): Promise<UserSummary[]>;
}
