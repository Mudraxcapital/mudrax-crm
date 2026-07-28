// ============================================================================
// Shared API route guard — auth + Caller Workspace path enforcement.
// Layout isolation does not wrap Route Handlers; every API must use this.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser, callerForbiddenForPath, type CurrentUser } from "./session";

export type ApiAuthResult =
  | { ok: true; current: CurrentUser }
  | { ok: false; response: NextResponse };

/**
 * Resolve the authenticated staff user for an API request and block
 * Caller-only identities from paths outside the Caller Workspace allowlist.
 */
export async function requireApiUser(request: Request): Promise<ApiAuthResult> {
  const current = await getCurrentUser();
  if (!current) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const pathname = new URL(request.url).pathname;
  if (callerForbiddenForPath(current.authContext, pathname)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, current };
}
