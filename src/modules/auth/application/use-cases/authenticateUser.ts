// ============================================================================
// src/modules/auth/application/use-cases/authenticateUser.ts
//
// The single login use-case: verifies credentials for the seeded/any
// Administrator account and every future User row, applying
// platform-contracts.md §3's Password Policy (lockout/backoff, every
// attempt Audit-logged) before delegating hash comparison to the
// application's chosen PasswordHasher port.
//
// `users` owns identity (ADR 0002) — this use-case reads/writes User data
// exclusively through `users`' public API, never a Prisma model directly.
// ============================================================================

import {
  countRecentFailedLoginAttempts,
  getUserAuthProfileByEmail,
  recordLoginAttempt,
  touchLastLogin,
} from "@/modules/users";
import type { PasswordHasher } from "../ports/PasswordHasher";
import type { AuthenticatedUser } from "../dto/AuthenticatedUser";
import {
  AccountLockedError,
  AccountNotActiveError,
  InvalidCredentialsError,
} from "../../domain/errors/AuthErrors";

const MAX_RECENT_FAILED_ATTEMPTS = 5;

export interface AuthenticateUserInput {
  email: string;
  password: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export function makeAuthenticateUser(passwordHasher: PasswordHasher) {
  return async function authenticateUser(input: AuthenticateUserInput): Promise<AuthenticatedUser> {
    const email = input.email.trim().toLowerCase();

    const recentFailures = await countRecentFailedLoginAttempts(email);
    if (recentFailures >= MAX_RECENT_FAILED_ATTEMPTS) {
      await recordLoginAttempt({
        userId: null,
        emailTried: email,
        succeeded: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: "LOCKED_OUT",
      });
      throw new AccountLockedError();
    }

    const profile = await getUserAuthProfileByEmail(email);

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

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      organizationId: profile.organizationId,
    };
  };
}
