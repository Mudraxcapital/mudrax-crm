// ============================================================================
// src/modules/users/domain/entities/User.ts
// ============================================================================

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** UI / messaging labels — DB keeps INACTIVE as the Disabled status. */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Disabled",
  SUSPENDED: "Suspended",
};

export function isAccountLoginAllowed(status: UserStatus): boolean {
  return status === "ACTIVE";
}

export function isAccountTemporarilyLocked(lockedUntil: Date | null | undefined): boolean {
  return !!lockedUntil && lockedUntil.getTime() > Date.now();
}

/** Display status for badges — Locked overrides Active when lockout is in effect. */
export function accountDisplayStatus(
  status: UserStatus,
  lockedUntil?: Date | null,
): UserStatus | "LOCKED" {
  if (status === "ACTIVE" && isAccountTemporarilyLocked(lockedUntil)) {
    return "LOCKED";
  }
  return status;
}

export const FIXED_USER_ROLES = ["Admin", "Manager", "Team Lead", "Caller"] as const;
export type FixedUserRole = (typeof FIXED_USER_ROLES)[number];

export const USER_SESSION_STATUSES = ["ACTIVE", "ENDED", "REVOKED"] as const;
export type UserSessionStatus = (typeof USER_SESSION_STATUSES)[number];

export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  sessionVersion: number;
  mustChangePassword: boolean;
  lockedUntil: Date | null;
  lockedReason: string | null;
  profilePhotoUrl: string | null;
  assignedTeamLeadId: string | null;
  reportingManagerId: string | null;
  currentTeamId: string | null;
  currentBranchId: string | null;
  currentDepartmentId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSessionRecord {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
  loginAt: Date;
  lastActivityAt: Date;
  logoutAt: Date | null;
  revokedAt: Date | null;
  revokeReason: string | null;
  status: UserSessionStatus;
}
