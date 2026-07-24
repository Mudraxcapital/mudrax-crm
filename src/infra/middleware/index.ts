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

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { nextUrl, cookies } = request;
  const { pathname } = nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isLoggedIn = Boolean(request.auth?.user);
  if (isLoggedIn) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  const hadSessionCookie = cookies.has(SESSION_COOKIE_NAME);
  const destination = new URL(hadSessionCookie ? "/session-expired" : "/login", nextUrl);
  if (!hadSessionCookie) {
    destination.searchParams.set("callbackUrl", `${nextUrl.pathname}${nextUrl.search}`);
  }
  return NextResponse.redirect(destination);
});
