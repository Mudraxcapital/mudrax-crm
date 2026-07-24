// ============================================================================
// src/infra/auth/config.ts
//
// Edge-safe Auth.js base config: no Credentials provider (which needs
// `authenticateUser` -> Prisma -> a TCP connection the Edge runtime cannot
// open) and no other Node-only dependency. This is the config `src/
// middleware.ts` runs, and it is extended with the Credentials provider in
// `src/infra/auth/index.ts` (the full, Node-runtime config used by Route
// Handlers and Server Components) — the standard Auth.js v5 "split config"
// pattern for Credentials + Middleware.
//
// Session strategy is JWT (required for a Credentials provider — there is
// no sign-in flow to attach a database session to). Cookie names are fixed
// explicitly (not left to Auth.js's environment-dependent default) so the
// rest of this app (src/infra/middleware) can reason about one stable name.
// ============================================================================

import type { NextAuthConfig } from "next-auth";

const isProduction = process.env.NODE_ENV === "production";

/** 8-hour absolute session lifetime; refreshed (see updateAge) on activity — "session refresh". */
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
/** Re-issue the session cookie/JWT at most once per hour of activity, extending maxAge — rolling refresh. */
const SESSION_UPDATE_AGE_SECONDS = 60 * 60;

export const SESSION_COOKIE_NAME = isProduction
  ? "__Secure-mudrax.session-token"
  : "mudrax.session-token";

export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/session-expired",
  "/unauthorized",
  "/api/auth",
  "/_next",
  "/favicon.ico",
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  // CSRF protection uses Auth.js defaults (double-submit cookie + the
  // built-in `csrfToken` on every credentials sign-in POST) — not overridden.
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;
      if (isPublicPath(pathname)) {
        return true;
      }
      return isLoggedIn;
    },
  },
};
