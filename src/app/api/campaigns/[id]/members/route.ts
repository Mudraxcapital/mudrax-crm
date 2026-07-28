// ============================================================================
// src/app/api/campaigns/[id]/members/route.ts
//
// Campaign Membership API — GET (list, requires `campaign.view`) and POST
// (add member, requires `campaign.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CampaignNotFoundError,
  InvalidMemberReferenceError,
  addCampaignMember,
  addCampaignMemberSchema,
  getCampaign,
  listCampaignMembers,
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
    const members = await listCampaignMembers(id);
    return NextResponse.json({ data: members });
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof CampaignAccessDeniedError) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "campaign.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = addCampaignMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const campaign = await getCampaign(id);
    assertCanAccessCampaignRecord(current.authContext, campaign);
    const membership = await addCampaignMember({
      campaignId: id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: membership }, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof CampaignAccessDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InvalidMemberReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
