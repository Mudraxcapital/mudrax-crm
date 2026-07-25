// ============================================================================
// Lightweight heartbeat for AccountStatusGuard — every authenticated CRM
// tab polls this so Disabled / Suspended / Locked / revoked sessions are
// force-logged out without a full page refresh.
// ============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/infra/auth";
import { assertAccountSessionValid, getAccountSessionState } from "@/modules/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  const valid = await assertAccountSessionValid(
    session.user.id,
    session.user.sessionVersion,
    session.user.sessionId || null,
  );

  if (!valid) {
    const state = await getAccountSessionState(session.user.id);
    if (state?.lockedUntil && state.lockedUntil.getTime() > Date.now()) {
      return NextResponse.json({ ok: false, reason: "locked" }, { status: 403 });
    }
    if (state && state.status !== "ACTIVE") {
      const reason = state.status === "SUSPENDED" ? "suspended" : "disabled";
      return NextResponse.json({ ok: false, reason }, { status: 403 });
    }
    return NextResponse.json({ ok: false, reason: "session_revoked" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    status: valid.status,
    sessionVersion: valid.sessionVersion,
    mustChangePassword: valid.mustChangePassword,
  });
}
