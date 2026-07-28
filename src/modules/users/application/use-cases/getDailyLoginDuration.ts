// ============================================================================
// Daily login duration for Caller Workspace timers — survives logout within
// the same calendar day; resets at the next local-day boundary.
// ============================================================================

import type { UserRepository } from "../../domain/repositories/UserRepository";
import {
  startOfLocalDay,
  sumLoginSecondsInWindow,
} from "../../domain/services/dailyLoginDuration";

export interface DailyLoginDurationDto {
  /** Completed sessions earlier today (excludes the current JWT session). */
  priorSecondsToday: number;
  /** All sessions today including the current one up to `now`. */
  totalSecondsToday: number;
  /** Local start-of-day used for the window (ISO). */
  dayStartedAt: string;
}

export function makeGetDailyLoginDuration(repository: UserRepository) {
  return async function getDailyLoginDuration(input: {
    userId: string;
    currentSessionId?: string | null;
    now?: Date;
  }): Promise<DailyLoginDurationDto> {
    const now = input.now ?? new Date();
    const dayStart = startOfLocalDay(now);
    const sessions = await repository.listSessionHistory(input.userId, 50);

    const priorSecondsToday = sumLoginSecondsInWindow(sessions, dayStart, now, {
      excludeSessionId: input.currentSessionId ?? undefined,
    });
    const totalSecondsToday = sumLoginSecondsInWindow(sessions, dayStart, now);

    return {
      priorSecondsToday,
      totalSecondsToday,
      dayStartedAt: dayStart.toISOString(),
    };
  };
}
