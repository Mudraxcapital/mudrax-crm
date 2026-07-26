// ============================================================================
// Shared vocabulary for stale-session / force-logout redirects to /login.
// ============================================================================

export const SESSION_CLEAR_REASONS = ["disabled", "suspended", "session_revoked"] as const;
export type SessionClearReason = (typeof SESSION_CLEAR_REASONS)[number];

export function isSessionClearReason(value: unknown): value is SessionClearReason {
  return (
    typeof value === "string" &&
    (SESSION_CLEAR_REASONS as readonly string[]).includes(value)
  );
}

/** Map a non-Active account status to the login-banner reason query param. */
export function accountStatusToClearReason(
  status: string,
): Extract<SessionClearReason, "disabled" | "suspended"> {
  return status === "SUSPENDED" ? "suspended" : "disabled";
}

export function loginRedirectForClearReason(reason: SessionClearReason | null | undefined): string {
  if (reason && isSessionClearReason(reason)) {
    return `/login?reason=${encodeURIComponent(reason)}`;
  }
  return "/login";
}
