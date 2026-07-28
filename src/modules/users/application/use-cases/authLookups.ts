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
import { isAccountLoginAllowed } from "../../domain/entities/User";
import { parseUserAgent } from "../../domain/services/userAgent";

export type AccountSessionCheck =
  | { ok: true; state: AccountSessionState }
  | { ok: false; reason: "disabled" | "suspended" | "session_revoked" };

export function makeUserAuthUseCases(repository: UserRepository) {
  async function checkAccountSession(
    userId: string,
    sessionVersionFromToken?: number | null,
    trackedSessionId?: string | null,
  ): Promise<AccountSessionCheck> {
    const state = await repository.findAccountSessionState(userId);
    if (!state) {
      return { ok: false, reason: "session_revoked" };
    }
    if (!isAccountLoginAllowed(state.status)) {
      return {
        ok: false,
        reason: state.status === "SUSPENDED" ? "suspended" : "disabled",
      };
    }
    if (
      typeof sessionVersionFromToken === "number" &&
      state.sessionVersion !== sessionVersionFromToken
    ) {
      return { ok: false, reason: "session_revoked" };
    }
    if (trackedSessionId) {
      const session = await repository.findSessionById(trackedSessionId);
      if (!session || session.userId !== userId || session.status !== "ACTIVE") {
        return { ok: false, reason: "session_revoked" };
      }
      await repository.touchSessionActivity(trackedSessionId);
    }
    return { ok: true, state };
  }

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

    checkAccountSession,

    /**
     * Centralized session gate — used by getCurrentUser.
     * Returns null when the session must end.
     */
    async assertAccountSessionValid(
      userId: string,
      sessionVersionFromToken?: number | null,
      trackedSessionId?: string | null,
    ): Promise<AccountSessionState | null> {
      const result = await checkAccountSession(
        userId,
        sessionVersionFromToken,
        trackedSessionId,
      );
      return result.ok ? result.state : null;
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

    async getUserSummary(userId: string): Promise<UserSummary | null> {
      return repository.findSummaryById(userId);
    },

    /**
     * Compatibility signature — `organizationId` is ignored (single-company).
     * Call sites across CRM/Campaigns keep compiling unchanged.
     */
    async listUserSummaries(organizationId?: string): Promise<UserSummary[]> {
      void organizationId;
      return repository.listSummaries();
    },
  };
}

export type UserAuthUseCases = ReturnType<typeof makeUserAuthUseCases>;
