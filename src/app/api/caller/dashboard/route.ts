// ============================================================================
// Caller mobile / workspace dashboard — wraps getCallerDashboard.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { isCallerWorkspaceUser } from "@/modules/rbac";
import { getCallerDashboard } from "@/modules/caller-workspace";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!isCallerWorkspaceUser(current.authContext)) {
    return NextResponse.json({ error: "Caller workspace only." }, { status: 403 });
  }

  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");

  try {
    const dashboard = await getCallerDashboard({
      organizationId: current.authContext.organizationId,
      callerUserId: current.session.user.id,
      loginAt: new Date().toISOString(),
      currentSessionId: current.session.user.sessionId ?? null,
      campaignId: campaignId || null,
    });
    return NextResponse.json({ data: dashboard });
  } catch (error) {
    console.error("[api/caller/dashboard]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard." },
      { status: 500 },
    );
  }
}
