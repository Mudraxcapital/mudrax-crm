// ============================================================================
// src/modules/auth/application/use-cases/authenticateUser.ts
// ============================================================================

import { getCompanyId } from "@/infra/company/getCompanyId";
import {
  countRecentFailedLoginAttempts,
  createLoginSession,
  getUserAuthProfileByEmail,
  isAccountTemporarilyLocked,
  lockUserAccount,
  recordLoginAttempt,
  touchLastLogin,
} from "@/modules/users";
import { LOGIN_LOCK_POLICY } from "../../domain/policies/loginLockPolicy";
import type { PasswordHasher } from "../ports/PasswordHasher";
import type { AuthenticatedUser } from "../dto/AuthenticatedUser";
import {
  AccountLockedError,
  AccountNotActiveError,
  InvalidCredentialsError,
} from "../../domain/errors/AuthErrors";

export interface AuthenticateUserInput {
  email: string;
  password: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export function makeAuthenticateUser(passwordHasher: PasswordHasher) {
  return async function authenticateUser(input: AuthenticateUserInput): Promise<AuthenticatedUser> {
    const email = input.email.trim().toLowerCase();

    const profile = await getUserAuthProfileByEmail(email);

    if (profile && isAccountTemporarilyLocked(profile.lockedUntil)) {
      await recordLoginAttempt({
        userId: profile.id,
        emailTried: email,
        succeeded: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "LOCKED_OUT",
      });
      throw new AccountLockedError();
    }

    const recentFailures = await countRecentFailedLoginAttempts(email);
    if (recentFailures >= LOGIN_LOCK_POLICY.maxFailedAttempts) {
      if (profile) {
        const lockedUntil = new Date(
          Date.now() + LOGIN_LOCK_POLICY.lockDurationMinutes * 60_000,
        );
        await lockUserAccount(
          profile.id,
          lockedUntil,
          `Exceeded ${LOGIN_LOCK_POLICY.maxFailedAttempts} failed sign-in attempts`,
        );
      }
      await recordLoginAttempt({
        userId: profile?.id ?? null,
        emailTried: email,
        succeeded: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "LOCKED_OUT",
      });
      throw new AccountLockedError();
    }

    if (!profile) {
      await recordLoginAttempt({
        userId: null,
        emailTried: email,
        succeeded: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "NO_SUCH_USER",
      });
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await passwordHasher.verify(input.password, profile.passwordHash);
    if (!passwordMatches) {
      await recordLoginAttempt({
        userId: profile.id,
        emailTried: email,
        succeeded: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "BAD_PASSWORD",
      });

      const failuresAfter = await countRecentFailedLoginAttempts(email);
      if (failuresAfter >= LOGIN_LOCK_POLICY.maxFailedAttempts) {
        const lockedUntil = new Date(
          Date.now() + LOGIN_LOCK_POLICY.lockDurationMinutes * 60_000,
        );
        await lockUserAccount(
          profile.id,
          lockedUntil,
          `Exceeded ${LOGIN_LOCK_POLICY.maxFailedAttempts} failed sign-in attempts`,
        );
        throw new AccountLockedError();
      }
      throw new InvalidCredentialsError();
    }

    if (profile.status !== "ACTIVE") {
      await recordLoginAttempt({
        userId: profile.id,
        emailTried: email,
        succeeded: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: `ACCOUNT_${profile.status}`,
      });
      throw new AccountNotActiveError();
    }

    await recordLoginAttempt({
      userId: profile.id,
      emailTried: email,
      succeeded: true,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      failureReason: null,
    });
    await touchLastLogin(profile.id);

    const session = await createLoginSession({
      userId: profile.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    // Refresh sessionVersion after possible prior lock revoke-all.
    const fresh = await getUserAuthProfileByEmail(email);

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      organizationId: await getCompanyId(),
      sessionVersion: fresh?.sessionVersion ?? profile.sessionVersion,
      sessionId: session.id,
      mustChangePassword: fresh?.mustChangePassword ?? profile.mustChangePassword,
    };
  };
}
