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
  "/clear-session",
  "/login",
  "/change-password",
  "/profile",
  "/profile/security",
  "/api/auth",
  "/api/health",
  "/api/ready",
  "/api/live",
] as const;

/**
 * Admin / management surfaces Callers must never reach — even with a direct URL.
 * Note: `/campaigns` and `/reports` are NOT blanket-blocked — see
 * `callerWorkspaceRedirect` + dashboard allow rules below (blocking `/campaigns`
 * as a prefix incorrectly denied `/campaigns/:id/dashboard`).
 */
const BLOCKED_PREFIXES = [
  "/crm",
  "/customers",
  "/users",
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
  "/admin",
  "/api/customers",
  "/api/users",
  "/api/campaigns",
  "/api/documents",
  "/api/banks",
  "/api/disbursements",
  "/api/loan",
  "/api/loan-applications",
  "/api/loan-accounts",
  "/api/loan-products",
  "/api/leads/export",
  "/api/leads/pipeline",
  "/api/reports",
] as const;

const ALLOWED_PREFIXES = [
  "/caller",
  "/leaderboard",
  "/notifications",
  "/api/leads",
  "/api/follow-ups",
  "/api/notifications",
  "/api/search",
] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Remap admin Campaigns / Reports URLs to Caller Workspace surfaces.
 * Returns null when no remap is needed (path already caller-safe or unrelated).
 */
export function callerWorkspaceRedirect(pathname: string): string | null {
  if (pathname === "/campaigns" || pathname === "/campaigns/") {
    return "/caller/campaigns";
  }
  // Campaign create / edit / imports → membership dashboard when an id is present.
  const campaignManage = pathname.match(/^\/campaigns\/([^/]+)\/(edit|imports)\/?$/);
  if (campaignManage?.[1]) {
    return `/campaigns/${campaignManage[1]}/dashboard`;
  }
  if (pathname === "/campaigns/new") {
    return "/caller/campaigns";
  }
  // Bare campaign detail (not dashboard) → dashboard.
  const campaignDetail = pathname.match(/^\/campaigns\/([^/]+)\/?$/);
  if (campaignDetail?.[1]) {
    return `/campaigns/${campaignDetail[1]}/dashboard`;
  }
  if (pathname === "/reports" || pathname.startsWith("/reports/")) {
    return "/leaderboard";
  }
  return null;
}

export function isCallerAllowedPath(pathname: string): boolean {
  if (pathname === "/") return true;

  if (ALWAYS_ALLOWED.some((prefix) => matchesPrefix(pathname, prefix))) {
    return true;
  }

  // Remapped by the root layout — allow so we redirect instead of unauthorized.
  if (callerWorkspaceRedirect(pathname)) {
    return true;
  }

  if (BLOCKED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return false;
  }

  // Legacy lead detail / list — pages redirect into /caller/*; still allow.
  if (pathname === "/leads" || /^\/leads\/[^/]+(\/.*)?$/.test(pathname)) {
    return !matchesPrefix(pathname, "/leads/import") && !matchesPrefix(pathname, "/leads/pipeline");
  }

  // Campaign Dashboard — Callers may open their membership-scoped dashboard.
  if (/^\/campaigns\/[^/]+\/dashboard\/?$/.test(pathname)) {
    return true;
  }

  // Telephony for own activity only — pages/APIs enforce agent hierarchy filters.
  // Outcome catalog management remains Admin-only.
  if (matchesPrefix(pathname, "/telephony")) {
    return !matchesPrefix(pathname, "/telephony/outcomes");
  }
  if (matchesPrefix(pathname, "/api/telephony")) {
    return !matchesPrefix(pathname, "/api/telephony/outcomes");
  }

  return ALLOWED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}
