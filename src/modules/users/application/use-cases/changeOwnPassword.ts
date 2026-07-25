// ============================================================================
// Self-service password change — any authenticated employee, own account only.
// Requires current password. Never used for Admin "Reset Password".
// ============================================================================

import type { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { validatePasswordPolicy } from "@/modules/auth/domain/policies/passwordPolicy";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import {
  InvalidUserHierarchyError,
  UserNotFoundError,
} from "../../domain/errors/UserErrors";

export function makeChangeOwnPassword(
  repository: UserRepository,
  passwordHasher: PasswordHasher,
) {
  return async function changeOwnPassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    ipAddress?: string | null;
  }): Promise<void> {
    const user = await repository.findById(input.userId);
    if (!user) throw new UserNotFoundError(input.userId);

    const profile = await repository.findAuthProfileByEmail(user.email);
    if (!profile) throw new UserNotFoundError(input.userId);

    const matches = await passwordHasher.verify(input.currentPassword, profile.passwordHash);
    if (!matches) {
      throw new InvalidUserHierarchyError("Current password is incorrect.");
    }

    if (input.currentPassword === input.newPassword) {
      throw new InvalidUserHierarchyError(
        "New password cannot be the same as the current password.",
      );
    }

    const policyError = validatePasswordPolicy(input.newPassword);
    if (policyError) {
      throw new InvalidUserHierarchyError(policyError);
    }

    // Same hash as current would also be rejected by the plaintext check above;
    // still verify so a future hasher change cannot silently reuse the hash.
    const sameHash = await passwordHasher.verify(input.newPassword, profile.passwordHash);
    if (sameHash) {
      throw new InvalidUserHierarchyError(
        "New password cannot be the same as the current password.",
      );
    }

    const passwordHash = await passwordHasher.hash(input.newPassword);
    await repository.setPasswordHashWithAudit(
      input.userId,
      passwordHash,
      { actorType: "USER", actorId: input.userId },
      null,
      {
        clearMustChangePassword: true,
        action: "Password Changed (Self)",
        ipAddress: input.ipAddress ?? null,
      },
    );
  };
}
