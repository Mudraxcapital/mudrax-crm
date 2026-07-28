// ============================================================================
// src/app/api/leads/[id]/stage/route.ts
//
// Lead Stage-change API — POST, requires `lead.update`.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  changeLeadStage,
  changeLeadStageSchema,
  InvalidLeadStageReferenceError,
  InvalidLostReasonReferenceError,
  LeadAlreadyClosedError,
  LostReasonRequiredError,
} from "@/modules/leads";
import {
  LeadAccessDeniedError,
  requireAccessibleLead,
} from "@/modules/leads/presentation/controllers/requireLeadAccess";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "lead.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = changeLeadStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await requireAccessibleLead(current.authContext, id, {
      permissionCode: "lead.update",
      actorUserId: current.session.user.id,
    });
    const lead = await changeLeadStage({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: lead });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (
      error instanceof InvalidLeadStageReferenceError ||
      error instanceof InvalidLostReasonReferenceError ||
      error instanceof LeadAlreadyClosedError ||
      error instanceof LostReasonRequiredError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
