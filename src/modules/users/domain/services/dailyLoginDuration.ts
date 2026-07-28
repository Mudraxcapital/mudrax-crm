// ============================================================================
// Daily login-duration helpers — sum UserSession intervals clipped to a day
// window so logout does not wipe today's accumulated time.
// ============================================================================

export interface SessionInterval {
  id?: string;
  loginAt: Date;
  logoutAt: Date | null;
  revokedAt: Date | null;
  status: string;
}

export function startOfLocalDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function sessionEndAt(session: SessionInterval, now: Date): Date {
  if (session.logoutAt) return session.logoutAt;
  if (session.revokedAt) return session.revokedAt;
  if (session.status === "ACTIVE") return now;
  return now;
}

/**
 * Sum seconds of session presence overlapping `[windowStart, windowEnd]`.
 * Optionally skip one session (the live JWT session that the UI ticks).
 */
export function sumLoginSecondsInWindow(
  sessions: SessionInterval[],
  windowStart: Date,
  windowEnd: Date,
  options?: { excludeSessionId?: string },
): number {
  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  if (windowEndMs <= windowStartMs) return 0;

  let total = 0;
  for (const session of sessions) {
    if (options?.excludeSessionId && session.id === options.excludeSessionId) {
      continue;
    }
    const startMs = session.loginAt.getTime();
    const endMs = sessionEndAt(session, windowEnd).getTime();
    const clippedStart = Math.max(startMs, windowStartMs);
    const clippedEnd = Math.min(endMs, windowEndMs);
    if (clippedEnd > clippedStart) {
      total += Math.floor((clippedEnd - clippedStart) / 1000);
    }
  }
  return total;
}
