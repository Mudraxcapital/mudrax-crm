// ============================================================================
// src/modules/users/domain/entities/UserAuthProfile.ts
//
// The subset of `users`.User identity relevant to Authentication (ADR 0002 —
// `users` is the sole employee identity module; `passwordHash` lives here,
// never duplicated into `auth`). Framework-free: no Prisma types leak past
// the infrastructure/mappers layer.
// ============================================================================

export type UserStatus = "ACTIVE" | "SUSPENDED" | "OFFBOARDED";

export interface UserAuthProfile {
  id: string;
  organizationId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
}

/** Current organizational membership pointers used by RBAC Data Scope resolution (platform-contracts.md §2). */
export interface UserScopeContext {
  userId: string;
  organizationId: string;
  status: UserStatus;
  currentTeamId: string | null;
  currentBranchId: string | null;
  currentDepartmentId: string | null;
}
