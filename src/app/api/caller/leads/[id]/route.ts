// ============================================================================
// Caller Call Workspace lead aggregate — notes, timeline, next lead.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { isCallerWorkspaceUser } from "@/modules/rbac";
import {
  CallerLeadAccessDeniedError,
  getCallerWorkspaceLead,
} from "@/modules/caller-workspace";
import { LeadNotFoundError } from "@/modules/leads";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!isCallerWorkspaceUser(current.authContext)) {
    return NextResponse.json({ error: "Caller workspace only." }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");

  try {
    const lead = await getCallerWorkspaceLead({
      organizationId: current.authContext.organizationId,
      callerUserId: current.session.user.id,
      leadId: id,
      campaignId: campaignId || null,
    });
    return NextResponse.json({ data: lead });
  } catch (error) {
    if (error instanceof LeadNotFoundError || error instanceof CallerLeadAccessDeniedError) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    throw error;
  }
}
