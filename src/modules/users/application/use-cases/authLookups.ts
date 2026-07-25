// ============================================================================
// src/modules/users/application/use-cases/authLookups.ts
// ============================================================================

import type {
  RecordLoginAttemptInput,
  UserRepository,
} from "../../domain/repositories/UserRepository";
import type {
  AccountSessionState,
  UserAuthProfile,
  UserScopeContext,
  UserSummary,
} from "../../domain/entities/UserAuthProfile";
import {
  isAccountLoginAllowed,
  isAccountTemporarilyLocked,
} from "../../domain/entities/User";
import { parseUserAgent } from "../../domain/services/userAgent";

function failureWindowMinutes(): number {
  const raw = process.env.AUTH_FAILURE_WINDOW_MINUTES;
  const value = raw ? Number.parseInt(raw, 10) : 15;
  return Number.isFinite(value) && value > 0 ? value : 15;
}

export function makeUserAuthUseCases(repository: UserRepository) {
  return {
    async getUserAuthProfileByEmail(email: string): Promise<UserAuthProfile | null> {
      return repository.findAuthProfileByEmail(email);
    },

    async getUserScopeContext(userId: string): Promise<UserScopeContext | null> {
      return repository.findScopeContext(userId);
    },

    async getAccountSessionState(userId: string): Promise<AccountSessionState | null> {
      return repository.findAccountSessionState(userId);
    },

    /**
     * Centralized session gate — used by getCurrentUser, APIs, and the
     * AccountStatusGuard heartbeat. Returns null when the session must end.
     */
    async assertAccountSessionValid(
      userId: string,
      sessionVersionFromToken?: number | null,
      trackedSessionId?: string | null,
    ): Promise<AccountSessionState | null> {
      const state = await repository.findAccountSessionState(userId);
      if (!state) return null;
      if (!isAccountLoginAllowed(state.status)) return null;
      if (isAccountTemporarilyLocked(state.lockedUntil)) return null;
      if (
        typeof sessionVersionFromToken === "number" &&
        state.sessionVersion !== sessionVersionFromToken
      ) {
        return null;
      }
      if (trackedSessionId) {
        const session = await repository.findSessionById(trackedSessionId);
        if (!session || session.userId !== userId || session.status !== "ACTIVE") {
          return null;
        }
        await repository.touchSessionActivity(trackedSessionId);
      }
      return state;
    },

    async countRecentFailedLoginAttempts(email: string): Promise<number> {
      return repository.countRecentFailedLoginAttempts(email, failureWindowMinutes());
    },

    async recordLoginAttempt(input: RecordLoginAttemptInput): Promise<void> {
      return repository.recordLoginAttempt(input);
    },

    async touchLastLogin(userId: string): Promise<void> {
      return repository.touchLastLogin(userId);
    },

    async createLoginSession(input: {
      userId: string;
      ipAddress: string | null;
      userAgent: string | null;
    }) {
      const { device, browser } = parseUserAgent(input.userAgent);
      return repository.createSession({
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        device,
        browser,
      });
    },

    async endLoginSession(sessionId: string, reason?: string | null): Promise<void> {
      await repository.endSession(sessionId, reason);
    },

    async lockUserAccount(
      userId: string,
      lockedUntil: Date,
      reason: string,
    ): Promise<void> {
      await repository.lockAccount(userId, lockedUntil, reason, {
        actorType: "SYSTEM",
        actorId: null,
      });
      await repository.revokeAllSessionsForUser(userId, "ACCOUNT_LOCKED");
    },

    async getUserSummary(userId: string): Promise<UserSummary | null> {
      return repository.findSummaryById(userId);
    },

    /**
     * Compatibility signature — `organizationId` is ignored (single-company).
     * Call sites across CRM/Campaigns keep compiling unchanged.
     */
    async listUserSummaries(_organizationId?: string): Promise<UserSummary[]> {
      return repository.listSummaries();
    },
  };
}

export type UserAuthUseCases = ReturnType<typeof makeUserAuthUseCases>;
