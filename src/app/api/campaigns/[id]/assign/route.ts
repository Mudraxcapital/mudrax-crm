// ============================================================================
// src/app/api/campaigns/[id]/assign/route.ts
//
// Campaign Assignment API — POST, requires `campaign.assign`. Triggers an
// allocation run distributing the given Leads among active members.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CampaignNotFoundError,
  InvalidAllocationError,
  InvalidLeadReferenceError,
  NoActiveMembersError,
  assignCampaignLeads,
  assignCampaignLeadsSchema,
} from "@/modules/campaigns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "campaign.assign")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = assignCampaignLeadsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const assignment = await assignCampaignLeads({
      campaignId: id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof NoActiveMembersError ||
      error instanceof InvalidAllocationError ||
      error instanceof InvalidLeadReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
