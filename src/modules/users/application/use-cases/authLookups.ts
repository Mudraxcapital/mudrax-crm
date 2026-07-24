// ============================================================================
// src/modules/users/application/use-cases/authLookups.ts
//
// Thin use-cases wrapping UserRepository for the Authentication/RBAC
// boundary this module exposes to `auth` and `rbac` through index.ts.
// Kept framework-free — no Next.js/Prisma imports here.
// ============================================================================

import type {
  RecordLoginAttemptInput,
  UserRepository,
} from "../../domain/repositories/UserRepository";
import type { UserAuthProfile, UserScopeContext } from "../../domain/entities/UserAuthProfile";

const RECENT_FAILURE_WINDOW_MINUTES = 15;

export function makeUserAuthUseCases(repository: UserRepository) {
  return {
    async getUserAuthProfileByEmail(email: string): Promise<UserAuthProfile | null> {
      return repository.findAuthProfileByEmail(email);
    },

    async getUserScopeContext(userId: string): Promise<UserScopeContext | null> {
      return repository.findScopeContext(userId);
    },

    /** Password Policy — "lockout/backoff after repeated failures" (platform-contracts.md §3). */
    async countRecentFailedLoginAttempts(email: string): Promise<number> {
      return repository.countRecentFailedLoginAttempts(email, RECENT_FAILURE_WINDOW_MINUTES);
    },

    /** Every login attempt, success or failure, is Audit-logged (platform-contracts.md §3). */
    async recordLoginAttempt(input: RecordLoginAttemptInput): Promise<void> {
      return repository.recordLoginAttempt(input);
    },

    async touchLastLogin(userId: string): Promise<void> {
      return repository.touchLastLogin(userId);
    },
  };
}

export type UserAuthUseCases = ReturnType<typeof makeUserAuthUseCases>;
