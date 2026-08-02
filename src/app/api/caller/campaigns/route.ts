// ============================================================================
// Campaigns assigned to the logged-in Caller (membership-scoped).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { isCallerWorkspaceUser } from "@/modules/rbac";
import { listCampaignsForMember } from "@/modules/campaigns";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!isCallerWorkspaceUser(current.authContext)) {
    return NextResponse.json({ error: "Caller workspace only." }, { status: 403 });
  }

  try {
    const campaigns = await listCampaignsForMember(current.session.user.id);
    return NextResponse.json({ data: campaigns });
  } catch (error) {
    console.error("[api/caller/campaigns]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load campaigns." },
      { status: 500 },
    );
  }
}
