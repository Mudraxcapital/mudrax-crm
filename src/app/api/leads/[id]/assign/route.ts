// ============================================================================
// src/app/api/leads/[id]/assign/route.ts
//
// Lead Assignment API — POST, requires `lead.reassign`.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  assignLead,
  assignLeadSchema,
  InvalidAssigneeReferenceError,
} from "@/modules/leads";
import {
  LeadAccessDeniedError,
  requireAccessibleLead,
} from "@/modules/leads/presentation/controllers/requireLeadAccess";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "lead.reassign")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = assignLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await requireAccessibleLead(current.authContext, id, {
      permissionCode: "lead.reassign",
      actorUserId: current.session.user.id,
    });
    const lead = await assignLead({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: lead });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (error instanceof InvalidAssigneeReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
