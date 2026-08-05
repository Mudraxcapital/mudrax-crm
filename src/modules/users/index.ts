// Public API of the `users` module.

import { prisma } from "@/infra/db/client";
import { BcryptPasswordHasher } from "@/modules/auth/infrastructure/adapters/BcryptPasswordHasher";
import { LocalDiskStorageAdapter } from "@/integrations/storage/local/LocalDiskStorageAdapter";
import { PrismaUserRepository } from "./infrastructure/repositories/PrismaUserRepository";
import { RbacRoleAssignmentAdapter } from "./infrastructure/adapters/RbacRoleAssignmentAdapter";
import { PrismaLeadOwnershipAdapter } from "./infrastructure/adapters/PrismaLeadOwnershipAdapter";
import { makeUserAuthUseCases } from "./application/use-cases/authLookups";
import { makeCreateUser } from "./application/use-cases/createUser";
import { makeUpdateUser } from "./application/use-cases/updateUser";
import { makeUpdateOwnProfile } from "./application/use-cases/updateOwnProfile";
import {
  makeGetUser,
  makeListUserAuditLog,
  makeListUserLoginSessions,
  makeListUsers,
  makeListUsersByRole,
} from "./application/use-cases/getUser";
import { makeResetPassword } from "./application/use-cases/resetPassword";
import { makeBulkDeleteUsers, makeDeleteUser } from "./application/use-cases/deleteUser";
import {
  makeBulkChangeAccountStatus,
  makeChangeAccountStatus,
} from "./application/use-cases/changeAccountStatus";
import { makeResolveVisibleHierarchy } from "./application/use-cases/resolveVisibleHierarchy";
import {
  makeListActiveUserSessions,
  makeListUserSessionHistory,
  makeRevokeAllUserSessions,
  makeRevokeUserSession,
} from "./application/use-cases/manageSessions";
import { makeGetDailyLoginDuration } from "./application/use-cases/getDailyLoginDuration";
import { makeChangeOwnPassword } from "./application/use-cases/changeOwnPassword";
import { makeRegisterFailedLoginAttempt } from "./application/use-cases/registerFailedLoginAttempt";
import { makeUpdateProfilePhoto } from "./application/use-cases/updateProfilePhoto";
import { makeExportUsers } from "./application/use-cases/exportUsers";

export type {
  AccountSessionState,
  UserAuthProfile,
  UserScopeContext,
  UserStatus,
  UserSummary,
} from "./domain/entities/UserAuthProfile";
export type { User, FixedUserRole } from "./domain/entities/User";
export {
  USER_STATUSES,
  USER_STATUS_LABELS,
  FIXED_USER_ROLES,
  isAccountLoginAllowed,
  accountDisplayStatus,
} from "./domain/entities/User";
export type { RecordLoginAttemptInput, ListUsersFilter } from "./domain/repositories/UserRepository";
export type {
  UserDto,
  UserListItemDto,
  UserAuditRecordDto,
  UserLoginSessionDto,
  UserTrackedSessionDto,
} from "./application/dto/UserDto";
export type { DailyLoginDurationDto } from "./application/use-cases/getDailyLoginDuration";
export {
  createUserSchema,
  updateUserSchema,
  updateOwnProfileSchema,
  resetPasswordSchema,
  changeOwnPasswordSchema,
  bulkUserIdsSchema,
  listUsersQuerySchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateOwnProfileInput,
  type ResetPasswordInput,
  type ChangeOwnPasswordInput,
  type BulkUserIdsInput,
  type ListUsersQuery,
} from "./application/validators/userSchemas";
export {
  UserNotFoundError,
  DuplicateEmployeeIdError,
  DuplicateUserEmailError,
  DuplicateUserPhoneError,
  InvalidUserRoleError,
  AdminRoleProtectedError,
  InvalidUserHierarchyError,
  CannotDeleteSelfError,
  LastActiveAdminError,
  SingleAdminLimitError,
  UserDeleteBlockedError,
} from "./domain/errors/UserErrors";
export {
  isDirectAdminCaller,
  callerReportsToLabel,
} from "./application/services/callerReporting";
export {
  DIRECT_ADMIN_REASSIGN_LABEL,
  REASSIGN_CALLERS_TO_DIRECT_ADMIN,
} from "./presentation/constants/callerReassignment";
export {
  roleMaySelfServiceChangePassword,
  adminAssignedPasswordRole,
  isForcedPasswordChangeAllowedPath,
} from "./application/services/selfServicePasswordPolicy";
export {
  LOGIN_LOCKOUT_THRESHOLD,
  LOGIN_LOCKOUT_REASON,
  roleSubjectToLoginLockout,
} from "./application/services/loginLockoutPolicy";
export {
  canChangeCallerAccountStatus,
  canDeleteUserAccounts,
} from "./application/services/callerLifecyclePolicy";

const userRepository = new PrismaUserRepository(prisma);
const roleAssignment = new RbacRoleAssignmentAdapter();
const leadOwnership = new PrismaLeadOwnershipAdapter(prisma);
const passwordHasher = new BcryptPasswordHasher();
const profileStorage = new LocalDiskStorageAdapter(
  process.env.DOCUMENTS_LOCAL_STORAGE_ROOT ?? undefined,
);
const userAuthUseCases = makeUserAuthUseCases(userRepository);

export const getUserAuthProfileByEmail = userAuthUseCases.getUserAuthProfileByEmail;
export const getUserScopeContext = userAuthUseCases.getUserScopeContext;
export const getAccountSessionState = userAuthUseCases.getAccountSessionState;
export const checkAccountSession = userAuthUseCases.checkAccountSession;
export const assertAccountSessionValid = userAuthUseCases.assertAccountSessionValid;
export type { AccountSessionCheck } from "./application/use-cases/authLookups";
export const recordLoginAttempt = userAuthUseCases.recordLoginAttempt;
export const touchLastLogin = userAuthUseCases.touchLastLogin;
export const createLoginSession = userAuthUseCases.createLoginSession;
export const endLoginSession = userAuthUseCases.endLoginSession;
export const getUserSummary = userAuthUseCases.getUserSummary;
export const listUserSummaries = userAuthUseCases.listUserSummaries;

export const createUser = makeCreateUser(userRepository, roleAssignment, passwordHasher);
export const updateUser = makeUpdateUser(userRepository, roleAssignment, leadOwnership);
export const updateOwnProfile = makeUpdateOwnProfile(userRepository, roleAssignment);
export const getUser = makeGetUser(userRepository, roleAssignment);
export const listUsers = makeListUsers(userRepository);
export const listUserAuditLog = makeListUserAuditLog(userRepository);
export const listUserLoginSessions = makeListUserLoginSessions(userRepository);
export const listUsersByRole = makeListUsersByRole(userRepository);
export const resetUserPassword = makeResetPassword(userRepository, roleAssignment, passwordHasher);
export const deleteUser = makeDeleteUser(userRepository, roleAssignment, leadOwnership);
export const changeAccountStatus = makeChangeAccountStatus(userRepository, roleAssignment);
export const bulkChangeAccountStatus = makeBulkChangeAccountStatus(userRepository, roleAssignment);
export const bulkDeleteUsers = makeBulkDeleteUsers(userRepository, roleAssignment, leadOwnership);
export const resolveVisibleHierarchy = makeResolveVisibleHierarchy(
  userRepository,
  roleAssignment,
);

export const listActiveUserSessions = makeListActiveUserSessions(userRepository);
export const listUserSessionHistory = makeListUserSessionHistory(userRepository);
export const getDailyLoginDuration = makeGetDailyLoginDuration(userRepository);
export const revokeUserSession = makeRevokeUserSession(userRepository, roleAssignment);
export const revokeAllUserSessions = makeRevokeAllUserSessions(userRepository, roleAssignment);
export const changeOwnPassword = makeChangeOwnPassword(userRepository, passwordHasher, roleAssignment);
export const registerFailedLoginAttempt = makeRegisterFailedLoginAttempt(
  userRepository,
  roleAssignment,
);
export const updateProfilePhoto = makeUpdateProfilePhoto(
  userRepository,
  roleAssignment,
  profileStorage,
);
export const exportUsers = makeExportUsers(userRepository);

export async function countAssignedLeadsForUser(userId: string): Promise<number> {
  return leadOwnership.countAssignedLeads(userId);
}

export async function countAssignedFollowUpsForUser(userId: string): Promise<number> {
  return leadOwnership.countAssignedFollowUps(userId);
}

export async function countCampaignsForManagerUser(managerId: string): Promise<number> {
  return userRepository.countCampaignsForManager(managerId);
}

export async function countAssignedLeadsByUserIds(
  userIds: string[],
): Promise<Map<string, number>> {
  return leadOwnership.countAssignedLeadsByUserIds(userIds);
}

/** Low-level storage retrieve for profile photo API. */
export async function retrieveProfilePhotoBytes(storageKey: string): Promise<Buffer> {
  return profileStorage.retrieve(storageKey);
}
