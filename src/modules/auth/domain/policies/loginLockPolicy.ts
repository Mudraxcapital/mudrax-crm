// ============================================================================
// Configurable failed-login lockout (env overrides, sensible defaults).
// ============================================================================

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const LOGIN_LOCK_POLICY = {
  /** Failed attempts inside the window before temporary lock. */
  maxFailedAttempts: intEnv("AUTH_MAX_FAILED_ATTEMPTS", 5),
  /** Sliding window for counting failures (minutes). */
  failureWindowMinutes: intEnv("AUTH_FAILURE_WINDOW_MINUTES", 15),
  /** How long the account stays locked (minutes). */
  lockDurationMinutes: intEnv("AUTH_LOCK_DURATION_MINUTES", 30),
} as const;
