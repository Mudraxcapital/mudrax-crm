// ============================================================================
// src/app/api/campaigns/[id]/route.ts
//
// Campaign API — GET (read one, requires `campaign.view`) and PATCH (update,
// requires `campaign.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CampaignNotFoundError,
  getCampaign,
  updateCampaign,
  updateCampaignSchema,
} from "@/modules/campaigns";
import {
  assertCanAccessCampaignRecord,
  CampaignAccessDeniedError,
} from "@/shared/auth/assertCanAccessCampaign";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "campaign.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const campaign = await getCampaign(id);
    assertCanAccessCampaignRecord(current.authContext, campaign);
    return NextResponse.json({ data: campaign });
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof CampaignAccessDeniedError) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "campaign.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const existing = await getCampaign(id);
    assertCanAccessCampaignRecord(current.authContext, existing);
    const campaign = await updateCampaign({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: campaign });
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof CampaignAccessDeniedError) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    throw error;
  }
}
