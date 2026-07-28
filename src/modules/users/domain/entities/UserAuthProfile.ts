// ============================================================================
// src/modules/users/domain/entities/UserAuthProfile.ts
// ============================================================================

import type { UserStatus } from "./User";

export type { UserStatus };

export interface UserAuthProfile {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  sessionVersion: number;
  mustChangePassword: boolean;
}

/** Lightweight projection for session validity checks (every authenticated request). */
export interface AccountSessionState {
  userId: string;
  status: UserStatus;
  sessionVersion: number;
  mustChangePassword: boolean;
}

/** Membership pointers used by RBAC Data Scope resolution. */
export interface UserScopeContext {
  userId: string;
  status: UserStatus;
  currentTeamId: string | null;
  currentBranchId: string | null;
  currentDepartmentId: string | null;
  assignedTeamLeadId: string | null;
  reportingManagerId: string | null;
  canManageCallerAccounts: boolean;
}

/** Hierarchy edges needed to resolve Manager → Team Lead → Caller ownership. */
export interface UserHierarchyEdge {
  id: string;
  assignedTeamLeadId: string | null;
  reportingManagerId: string | null;
}

/**
 * Lightweight projection for assignment pickers.
 * `organizationId` is the single-company scope id (not stored on User) so
 * other modules' existing call sites keep working.
 */
export interface UserSummary {
  id: string;
  organizationId: string;
  employeeId: string;
  fullName: string;
  email: string;
  status: UserStatus;
  currentTeamId: string | null;
  currentBranchId: string | null;
}
