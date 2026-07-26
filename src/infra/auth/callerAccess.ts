// ============================================================================
// src/infra/auth/callerAccess.ts
//
// Caller Workspace isolation — which paths a Caller-only User may open.
// Enforced from the root layout (Node runtime) after RBAC resolution.
// Middleware cannot do this: Edge has no DB for Roles (see infra/middleware).
// ============================================================================

/** Header set by middleware so the Node layout can read the request path. */
export const PATHNAME_HEADER = "x-mudrax-pathname";

const ALWAYS_ALLOWED = [
  "/unauthorized",
  "/session-expired",
  "/login",
  "/change-password",
  "/profile",
  "/api/auth",
] as const;

/**
 * Admin / management surfaces Callers must never reach — even with a direct URL.
 */
const BLOCKED_PREFIXES = [
  "/crm",
  "/customers",
  "/users",
  "/reports",
  "/campaigns",
  "/leads/import",
  "/leads/pipeline",
  "/activity",
  "/calendar",
  "/follow-ups",
  "/documents",
  "/loans",
  "/loan-products",
  "/loan-accounts",
  "/loan-applications",
  "/banks",
  "/disbursements",
  "/telephony",
  "/admin",
  "/api/reports",
  "/api/customers",
  "/api/users",
  "/api/campaigns",
  "/api/documents",
  "/api/banks",
  "/api/disbursements",
  "/api/loan",
  "/api/telephony/agent-sessions",
  "/api/telephony/dashboard",
  "/api/telephony/missed-calls",
  "/api/leads/export",
  "/api/leads/pipeline",
  "/api/leads/import",
] as const;

const ALLOWED_PREFIXES = [
  "/caller",
  "/notifications",
  "/api/leads",
  "/api/follow-ups",
  "/api/telephony/calls",
  "/api/notifications",
  "/api/search",
] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isCallerAllowedPath(pathname: string): boolean {
  if (pathname === "/") return true;

  if (ALWAYS_ALLOWED.some((prefix) => matchesPrefix(pathname, prefix))) {
    return true;
  }

  if (BLOCKED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return false;
  }

  // Legacy lead detail / list — pages redirect into /caller/*; still allow.
  if (pathname === "/leads" || /^\/leads\/[^/]+(\/.*)?$/.test(pathname)) {
    return !matchesPrefix(pathname, "/leads/import") && !matchesPrefix(pathname, "/leads/pipeline");
  }

  return ALLOWED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}
