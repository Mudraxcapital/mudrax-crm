// ============================================================================
// src/app/api/campaigns/route.ts
//
// Campaign API — GET (list, requires `campaign.view`) and POST (create,
// requires `campaign.manage`). `organizationId` always comes from the
// acting User's own Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { createCampaign, createCampaignSchema, listCampaigns } from "@/modules/campaigns";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "campaign.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaigns = await listCampaigns(current.authContext.organizationId);
  return NextResponse.json({ data: campaigns });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "campaign.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const campaign = await createCampaign({
    organizationId: current.authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: current.session.user.id },
  });
  return NextResponse.json({ data: campaign }, { status: 201 });
}
