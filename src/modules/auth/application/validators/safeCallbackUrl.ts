// ============================================================================
// Restrict post-login redirects to same-origin relative paths only.
// ============================================================================

/**
 * Returns a safe in-app path for Auth.js `redirectTo` / login callbackUrl.
 * Rejects absolute URLs, protocol-relative URLs, and scheme handlers.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/",
): string {
  if (typeof raw !== "string") return fallback;

  const value = raw.trim();
  if (!value) return fallback;

  // Must be a root-relative path (not protocol-relative "//evil.com").
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  // Reject any URI scheme (javascript:, data:, http:, …) even if oddly encoded.
  if (value.includes("://") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    return fallback;
  }

  // Avoid bouncing straight back to auth entry points.
  if (
    value === "/login" ||
    value.startsWith("/login?") ||
    value === "/session-expired" ||
    value.startsWith("/session-expired?") ||
    value === "/clear-session" ||
    value.startsWith("/clear-session?")
  ) {
    return fallback;
  }

  return value;
}
