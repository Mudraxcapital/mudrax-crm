// ============================================================================
// src/modules/auth/application/use-cases/authenticateUser.ts
// ============================================================================

import { getCompanyId } from "@/infra/company/getCompanyId";
import {
  createLoginSession,
  getUserAuthProfileByEmail,
  recordLoginAttempt,
  touchLastLogin,
} from "@/modules/users";
import type { PasswordHasher } from "../ports/PasswordHasher";
import type { AuthenticatedUser } from "../dto/AuthenticatedUser";
import {
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

    // Disabled (INACTIVE) and Suspended accounts must never authenticate.
    if (profile.status !== "ACTIVE") {
      await recordLoginAttempt({
        userId: profile.id,
        emailTried: email,
        succeeded: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        failureReason: `ACCOUNT_${profile.status}`,
      });
      throw new AccountNotActiveError(profile.status);
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

    // touchLastLogin / createLoginSession do not mutate sessionVersion or mustChangePassword.
    const session = await createLoginSession({
      userId: profile.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      organizationId: await getCompanyId(),
      sessionVersion: profile.sessionVersion,
      sessionId: session.id,
      mustChangePassword: profile.mustChangePassword,
    };
  };
}
