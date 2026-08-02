/**
 * Serializable User contract (mirrors UserDto from the web CRM).
 */

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface User {
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
  canManageCallerAccounts: boolean;
  permissions?: string[];
}

export interface UserListItem {
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

export interface UserListResponse {
  data: UserListItem[];
  meta?: {
    limit?: number;
    offset?: number;
  };
}

export interface UserResponse {
  data: User;
}
