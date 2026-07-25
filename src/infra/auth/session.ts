// ============================================================================
// src/infra/auth/session.ts
//
// Ergonomic, RBAC-aware session helpers for Server Components and Route
// Handlers — "Make RBAC available server-side / in Server Components / in
// Route Handlers" combined with Authentication's session.
//
// Account status + sessionVersion are enforced here centrally via
// `assertAccountSessionValid` so every authenticated request rejects
// Disabled / Suspended / revoked sessions without scattered checks.
// ============================================================================

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "./index";
import {
  getAuthorizationContext,
  hasPermission,
  hasRole,
  isCallerWorkspaceUser,
  isInternalStaff,
} from "@/modules/rbac";
import type { AuthorizationContext } from "@/modules/rbac";
import { assertAccountSessionValid, getAccountSessionState } from "@/modules/users";
import { isCallerAllowedPath } from "./callerAccess";

/** Route Handler that may mutate the session cookie (Server Components cannot). */
export const CLEAR_STALE_SESSION_PATH = "/api/auth/clear-session";

export interface CurrentUser {
  session: Session;
  authContext: AuthorizationContext;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const valid = await assertAccountSessionValid(
    session.user.id,
    session.user.sessionVersion,
    session.user.sessionId || null,
  );
  if (!valid) {
    // Disabled / Suspended / locked / revoked session / sessionVersion mismatch.
    return null;
  }

  const authContext = await getAuthorizationContext(session.user.id);
  if (!authContext) {
    return null;
  }

  return { session, authContext };
});

/** Redirects anonymous requests to /login. Use at the top of a protected Server Component/layout. */
export async function requireAuth(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (current) {
    return current;
  }

  // Orphaned JWT (reseed / deleted / disabled): clear via Route Handler.
  const session = await auth();
  if (session?.user?.id) {
    const state = await getAccountSessionState(session.user.id);
    if (state?.lockedUntil && state.lockedUntil.getTime() > Date.now()) {
      redirect(`${CLEAR_STALE_SESSION_PATH}?reason=locked`);
    }
    if (state && state.status !== "ACTIVE") {
      const reason = state.status === "SUSPENDED" ? "suspended" : "disabled";
      redirect(`${CLEAR_STALE_SESSION_PATH}?reason=${reason}`);
    }
    redirect(CLEAR_STALE_SESSION_PATH);
  }

  redirect("/login");
}

/** Redirects to /unauthorized if the current User does not hold `roleName`. */
export async function requireRole(roleName: string): Promise<CurrentUser> {
  const current = await requireAuth();
  if (!hasRole(current.authContext, roleName)) {
    redirect("/unauthorized");
  }
  return current;
}

/** Redirects to /unauthorized if the current User does not hold `permissionCode`. */
export async function requirePermission(permissionCode: string): Promise<CurrentUser> {
  // CRM permission checks are staff-only — customers / external identities never pass.
  const current = await requireInternalStaff();
  if (!hasPermission(current.authContext, permissionCode)) {
    redirect("/unauthorized");
  }
  return current;
}

/**
 * CRM modules are staff-only. Customers / external identities (no internal
 * Role) are redirected to /unauthorized. Preserves existing RBAC grants for
 * Caller / Team Lead / Manager / Admin.
 */
export async function requireInternalStaff(): Promise<CurrentUser> {
  const current = await requireAuth();
  if (!isInternalStaff(current.authContext)) {
    redirect("/unauthorized");
  }
  return current;
}

/**
 * Caller Workspace only — Admin / Manager / Team Lead are redirected away so
 * they keep using the elevated CRM shell.
 */
export async function requireCallerWorkspace(): Promise<CurrentUser> {
  const current = await requireInternalStaff();
  if (!isCallerWorkspaceUser(current.authContext)) {
    redirect("/");
  }
  return current;
}

/**
 * Blocks Caller-only Users from admin CRM pages and APIs. Call at the top of
 * elevated Server Components / Route Handlers that are not already gated by a
 * permission Callers lack (e.g. campaign.manage).
 */
export async function forbidCallerWorkspace(): Promise<CurrentUser> {
  const current = await requireInternalStaff();
  if (isCallerWorkspaceUser(current.authContext)) {
    redirect("/unauthorized");
  }
  return current;
}

/** API variant — returns null when the Caller must not proceed (caller returns 403). */
export function callerForbiddenForPath(
  authContext: AuthorizationContext,
  pathname: string,
): boolean {
  return isCallerWorkspaceUser(authContext) && !isCallerAllowedPath(pathname);
}
