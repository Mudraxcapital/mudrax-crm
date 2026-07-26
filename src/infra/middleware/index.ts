// ============================================================================
// src/infra/middleware/index.ts
//
// Root middleware composition (auth guard). Runs on the Edge runtime, so it
// uses the lightweight, Prisma-free `src/infra/auth/config` — only the
// already-signed JWT session cookie is decoded here, no database call.
//
// Responsibilities (per the Authentication/Authorization task):
//   - Redirect unauthenticated users to /login (with a callbackUrl back to
//     where they were headed).
//   - Distinguish "never signed in" (/login) from "had a session that is
//     no longer valid" (/session-expired) by checking for the presence of
//     the session cookie even when it fails to decode.
//   - Exclude public assets and the public pages themselves (isPublicPath).
//   - Fine-grained Role/Permission checks (e.g. "is this User an Admin")
//     cannot happen here — that requires a database read, which the Edge
//     runtime cannot perform (see src/infra/db/client.ts's Prisma/`pg`
//     driver adapter). Admin-route protection is enforced at the Server
//     Component layer instead (src/infra/auth/session.ts's requireRole /
//     requirePermission, used e.g. by src/app/admin/layout.tsx), which runs
//     in the Node.js runtime and can read current Roles/Permissions.
// ============================================================================

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, isPublicPath, SESSION_COOKIE_NAME } from "../auth/config";
import { PATHNAME_HEADER } from "../auth/callerAccess";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { nextUrl, cookies } = request;
  const { pathname } = nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isLoggedIn = Boolean(request.auth?.user);
  if (isLoggedIn) {
    // Do not hard-redirect /login → / here. A JWT can decode successfully
    // after a user reseed while the user id no longer exists; the login page
    // (Node runtime) clears that stale cookie. Middleware cannot verify RBAC.
    // Path is forwarded so the Node layout can enforce Caller Workspace isolation.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const hadSessionCookie = cookies.has(SESSION_COOKIE_NAME);
  const destination = new URL(hadSessionCookie ? "/session-expired" : "/login", nextUrl);
  // Preserve the intended destination through session-expired → login → post-login redirect.
  destination.searchParams.set("callbackUrl", `${nextUrl.pathname}${nextUrl.search}`);
  return NextResponse.redirect(destination);
});
