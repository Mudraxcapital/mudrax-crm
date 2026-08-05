// ============================================================================
// Record a failed password attempt and suspend Managers / Team Leads / Callers
// after LOGIN_LOCKOUT_THRESHOLD consecutive failures.
// ============================================================================

import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import {
  LOGIN_LOCKOUT_REASON,
  LOGIN_LOCKOUT_THRESHOLD,
  roleSubjectToLoginLockout,
} from "../services/loginLockoutPolicy";

export interface RegisterFailedLoginAttemptInput {
  userId: string;
  emailTried: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export function makeRegisterFailedLoginAttempt(
  repository: UserRepository,
  roles: RoleAssignmentPort,
) {
  return async function registerFailedLoginAttempt(
    input: RegisterFailedLoginAttemptInput,
  ): Promise<{ suspended: boolean }> {
    await repository.recordLoginAttempt({
      userId: input.userId,
      emailTried: input.emailTried,
      succeeded: false,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      failureReason: "BAD_PASSWORD",
    });

    const role = await roles.getPrimaryRoleName(input.userId);
    if (!roleSubjectToLoginLockout(role)) {
      return { suspended: false };
    }

    const user = await repository.findById(input.userId);
    if (!user || user.status !== "ACTIVE") {
      return { suspended: false };
    }

    const consecutiveFails = await repository.countConsecutiveFailedPasswordAttempts(
      input.userId,
    );
    if (consecutiveFails < LOGIN_LOCKOUT_THRESHOLD) {
      return { suspended: false };
    }

    await repository.suspendForLoginLockout(input.userId, {
      reason: LOGIN_LOCKOUT_REASON,
      ipAddress: input.ipAddress,
    });
    return { suspended: true };
  };
}
