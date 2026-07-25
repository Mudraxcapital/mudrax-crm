// ============================================================================
// src/infra/auth/session.ts
//
// Ergonomic, RBAC-aware session helpers for Server Components and Route
// Handlers — "Make RBAC available server-side / in Server Components / in
// Route Handlers" combined with Authentication's session.
//
// `getCurrentAuthContext` re-resolves Roles/Permissions/Data Scope from the
// database on every call (see rbac.getAuthorizationContext's own doc
// comment on why) and is wrapped in React's `cache()` so, within a single
// request/render pass, repeated calls from many Server Components dedupe
// into one query instead of one per component.
// ============================================================================

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "./index";
import {
  getAuthorizationContext,
  hasPermission,
  hasRole,
  isInternalStaff,
} from "@/modules/rbac";
import type { AuthorizationContext } from "@/modules/rbac";

export interface CurrentUser {
  session: Session;
  authContext: AuthorizationContext;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const authContext = await getAuthorizationContext(session.user.id);
  if (!authContext) {
    // User has no active scope context (e.g. suspended/offboarded after sign-in) — treat as signed out.
    return null;
  }

  return { session, authContext };
});

/** Redirects anonymous requests to /login. Use at the top of a protected Server Component/layout. */
export async function requireAuth(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }
  return current;
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
 * Caller / Team Leader / Manager / Admin.
 */
export async function requireInternalStaff(): Promise<CurrentUser> {
  const current = await requireAuth();
  if (!isInternalStaff(current.authContext)) {
    redirect("/unauthorized");
  }
  return current;
}
