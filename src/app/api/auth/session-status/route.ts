// ============================================================================
// Lightweight heartbeat for AccountStatusGuard — every authenticated CRM
// tab polls this so Disabled / Suspended / revoked sessions are
// force-logged out without a full page refresh.
// ============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/infra/auth";
import { checkAccountSession } from "@/modules/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  const result = await checkAccountSession(
    session.user.id,
    session.user.sessionVersion,
    session.user.sessionId || null,
  );

  if (!result.ok) {
    const status = result.reason === "session_revoked" ? 401 : 403;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    status: result.state.status,
    sessionVersion: result.state.sessionVersion,
    mustChangePassword: result.state.mustChangePassword,
  });
}
