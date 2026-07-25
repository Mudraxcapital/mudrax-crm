// ============================================================================
// src/app/api/campaigns/route.ts
//
// Campaign API — GET (list, requires `campaign.view`) and POST (create,
// requires `campaign.manage`). `organizationId` always comes from the
// acting User's own Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission, requireOwnerManagerId } from "@/modules/rbac";
import { createCampaign, createCampaignSchema, listCampaigns } from "@/modules/campaigns";
import { managerBookFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "campaign.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const book = managerBookFilter(current.authContext);
  const campaigns = await listCampaigns(current.authContext.organizationId, book);
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

  try {
    const ownerManagerId = requireOwnerManagerId(
      current.authContext,
      typeof body?.ownerManagerId === "string" ? body.ownerManagerId : null,
    );
    const campaign = await createCampaign({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
      ownerManagerId,
    });
    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign." },
      { status: 422 },
    );
  }
}
